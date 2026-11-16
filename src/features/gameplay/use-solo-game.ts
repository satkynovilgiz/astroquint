"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getQuestion } from "@/features/questions/bank";
import { selectQuestions } from "@/features/questions/select";
import { mulberry32, randomId } from "@/lib/utils/random";
import { createGame, gameReducer, type GameAction, type GameState } from "./engine";
import { toView } from "./view";
import type { GameActions } from "./controller";

const SAVE_KEY = "astroquint:solo:v1";
const RECENT_KEY = "astroquint:recent:v1";
const RECENT_LIMIT = 30;

function load<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function save(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — game still works for this session */
  }
}

function loadSavedGame(): GameState | null {
  const g = load<GameState>(SAVE_KEY);
  if (!g || g.version !== 1 || !Array.isArray(g.rounds) || g.rounds.some((r) => !getQuestion(r.questionId))) return null;
  return g;
}

/**
 * Solo Orbit controller: runs the engine locally and saves progress to this
 * device so a refresh resumes the run. Solo is unranked practice; ranked
 * modes run the same engine on the server.
 */
export function useSoloGame() {
  const [game, setGame] = useState<GameState | null>(() => loadSavedGame());

  useEffect(() => {
    save(SAVE_KEY, game && game.phase !== "complete" ? game : null);
  }, [game]);

  const dispatch = useCallback((action: GameAction) => setGame((g) => (g ? gameReducer(g, action) : g)), []);

  const start = useCallback((relaxed: boolean) => {
    const recent = new Set(load<string[]>(RECENT_KEY) ?? []);
    const id = randomId();
    const questionIds = selectQuestions(mulberry32(parseInt(id.slice(0, 8), 16)), recent);
    save(RECENT_KEY, [...questionIds, ...recent].slice(0, RECENT_LIMIT));
    setGame(createGame({ id, questionIds, relaxed, now: Date.now() }));
  }, []);

  const quit = useCallback(() => setGame(null), []);

  const actions: GameActions = useMemo(
    () => ({
      begin: () => dispatch({ type: "begin", now: Date.now() }),
      lockWager: (wager) => dispatch({ type: "lockWager", wager, now: Date.now() }),
      submit: (answer) => dispatch({ type: "submit", answer, now: Date.now() }),
      expire: () => dispatch({ type: "timeout", now: Date.now() }),
      next: () => dispatch({ type: "continue" }),
      arrive: () => dispatch({ type: "arrive" }),
    }),
    [dispatch],
  );

  const view = useMemo(() => (game ? toView(game) : null), [game]);
  return { game, view, actions, start, quit };
}
