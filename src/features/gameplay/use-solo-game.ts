"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiRequestError } from "@/lib/api/client";
import { describeError, type FriendlyError } from "@/lib/api/errors";
import type { Answer } from "@/features/questions/types";
import type { GameActions, GameView } from "./controller";

const SAVE_KEY = "astroquint:solo:v2";
const RECENT_KEY = "astroquint:recent:v1";
const RECENT_LIMIT = 30;

interface SoloPayload {
  token: string;
  view: GameView;
  serverNow: number;
  playedIds: string[] | null;
}

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
    /* storage unavailable: the run still works for this session */
  }
}

type ActionBody = { type: "begin" } | { type: "lockWager"; wager: number } | { type: "submit"; answer: Answer } | { type: "timeout" } | { type: "continue" } | { type: "arrive" };

/**
 * Solo Orbit controller. The server runs the rules and holds the answers; the
 * browser keeps only a signed state token (saved on this device so a refresh
 * resumes the run).
 */
export function useSoloGame() {
  const [run, setRun] = useState<{ token: string; view: GameView; offset: number } | null>(() => load<{ token: string; view: GameView; offset: number }>(SAVE_KEY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FriendlyError | null>(null);
  const inflight = useRef(false);
  const [retryTick, setRetryTick] = useState(0);
  const retries = useRef(0);

  useEffect(() => {
    save(SAVE_KEY, run && run.view.phase !== "complete" ? run : null);
  }, [run]);

  const accept = useCallback((p: SoloPayload, sentAt: number) => {
    const offset = p.serverNow - (sentAt + Date.now()) / 2;
    if (p.playedIds) save(RECENT_KEY, [...p.playedIds, ...(load<string[]>(RECENT_KEY) ?? [])].slice(0, RECENT_LIMIT));
    setRun({ token: p.token, view: p.view, offset });
  }, []);

  const start = useCallback(
    async (relaxed: boolean) => {
      if (inflight.current) return;
      inflight.current = true;
      setBusy(true);
      setError(null);
      const sentAt = Date.now();
      try {
        accept(await api<SoloPayload>("/api/solo/start", { body: { relaxed, recent: load<string[]>(RECENT_KEY) ?? [] } }), sentAt);
      } catch (err) {
        setError(describeError(err, "solo-start"));
      } finally {
        inflight.current = false;
        setBusy(false);
      }
    },
    [accept],
  );

  const send = useCallback(
    async (action: ActionBody) => {
      if (inflight.current || !run) return;
      inflight.current = true;
      setBusy(true);
      setError(null);
      const sentAt = Date.now();
      try {
        const p = await api<SoloPayload>("/api/solo/action", { body: { token: run.token, action } });
        accept(p, sentAt);
        if (action.type === "timeout" && p.view.phase === "playing" && retries.current < 8) {
          retries.current++;
          setRetryTick((n) => n + 1);
        } else if (action.type !== "timeout") retries.current = 0;
      } catch (err) {
        if (err instanceof ApiRequestError && (err.code === "expired" || err.code === "bad_token")) setRun(null);
        setError(describeError(err, "game-action"));
      } finally {
        inflight.current = false;
        setBusy(false);
      }
    },
    [run, accept],
  );

  useEffect(() => {
    if (retryTick === 0) return;
    const t = setTimeout(() => void send({ type: "timeout" }), 400);
    return () => clearTimeout(t);
  }, [retryTick, send]);

  const quit = useCallback(() => setRun(null), []);

  const actions: GameActions = useMemo(
    () => ({
      begin: () => void send({ type: "begin" }),
      lockWager: (wager) => void send({ type: "lockWager", wager }),
      submit: (answer) => void send({ type: "submit", answer }),
      expire: () => void send({ type: "timeout" }),
      next: () => void send({ type: "continue" }),
      arrive: () => void send({ type: "arrive" }),
    }),
    [send],
  );

  const view: GameView | null = useMemo(
    () =>
      run
        ? { ...run.view, deadline: run.view.deadline === null ? null : run.view.deadline - run.offset, busy, error: error ? `${error.title}. ${error.message}` : null }
        : null,
    [run, busy, error],
  );

  return { view, actions, start, quit, busy, error, relaxed: run?.view.relaxed ?? false };
}
