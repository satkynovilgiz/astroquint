"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { presentQuestion } from "@/features/questions/present";
import { getQuestion } from "@/features/questions/bank";
import { selectQuestions } from "@/features/questions/select";
import { mulberry32, randomId } from "@/lib/utils/random";
import { createGame, gameReducer, type GameAction, type GameState } from "./engine";
import { summarize } from "./summary";
import type { GameActions, GameView } from "./controller";

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

export function questionTitle(questionId: string): string {
  const q = getQuestion(questionId);
  if (!q) return "";
  switch (q.world) {
    case "pattern-break":
      return `${q.sequence.join(", ")}`;
    case "truth-trap":
      return `Find the false statement: ${q.topic}`;
    default:
      return q.prompt;
  }
}

function reviewEntry(questionId: string, outcome: GameView["rounds"][number]["outcome"]) {
  const q = getQuestion(questionId)!;
  return { worldId: q.world, title: questionTitle(questionId), explanation: q.explanation, outcome };
}

export function toView(game: GameState): GameView {
  const round = game.rounds[game.roundIndex];
  const showQuestion = game.phase === "playing" || game.phase === "revealed";
  const q = getQuestion(round.questionId)!;
  return {
    phase: game.phase,
    roundIndex: game.roundIndex,
    worldId: round.worldId,
    question: showQuestion ? presentQuestion(q, game.seed) : null,
    deadline: round.deadline,
    relaxed: game.relaxed,
    score: game.score,
    rounds: game.rounds.map((r) => ({ worldId: r.worldId, outcome: r.outcome, points: r.points, wager: r.wager, wagerDelta: r.wagerDelta })),
    reveal: game.phase === "revealed" || game.phase === "travel" || game.phase === "complete" ? round.reveal : null,
    submitted: round.answer,
    wager: round.wager,
    summary: game.phase === "complete" ? summarize(game.rounds, game.score, game.relaxed) : null,
    review: game.phase === "complete" ? game.rounds.map((r) => reviewEntry(r.questionId, r.outcome)) : null,
    busy: false,
    error: null,
  };
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
