"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiRequestError } from "@/lib/api/client";
import type { Answer } from "@/features/questions/types";
import type { GameActions, GameView } from "./controller";

export interface MatchPayload {
  matchId: string;
  mode: "daily" | "daily-practice";
  ranked: boolean;
  dailyDate: string | null;
  view: GameView;
  serverNow: number;
  rank?: { rank: number; total: number } | null;
  newAchievements?: string[];
}

type ActionBody =
  | { type: "begin" }
  | { type: "lockWager"; wager: number }
  | { type: "submit"; answer: Answer }
  | { type: "timeout" }
  | { type: "continue" }
  | { type: "arrive" };

/**
 * Server-authoritative controller for ranked play. The browser only renders:
 * every action is validated, timed and scored by the server. Server deadlines
 * are translated to the local clock using the measured offset.
 */
export function useServerGame(initial: MatchPayload, initialOffsetMs = 0) {
  const [payload, setPayload] = useState(initial);
  const [offset, setOffset] = useState(initialOffsetMs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);
  const timeoutRetries = useRef(0);
  const [retryTick, setRetryTick] = useState(0);

  const send = useCallback(
    async (body: ActionBody) => {
      if (inflight.current) return; // one request at a time: no double submits
      inflight.current = true;
      setBusy(true);
      setError(null);
      const sentAt = Date.now();
      try {
        const next = await api<MatchPayload>(`/api/matches/${payload.matchId}/actions`, { body });
        const receivedAt = Date.now();
        setOffset(next.serverNow - (sentAt + receivedAt) / 2);
        setPayload((prev) => ({ ...next, rank: next.rank ?? prev.rank, newAchievements: next.newAchievements ?? prev.newAchievements }));
        // If our clock ran ahead of the server's, the timeout may be early: retry briefly.
        if (body.type === "timeout" && next.view.phase === "playing" && timeoutRetries.current < 8) {
          timeoutRetries.current++;
          setRetryTick((n) => n + 1);
        } else if (body.type !== "timeout") {
          timeoutRetries.current = 0;
        }
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again.");
      } finally {
        inflight.current = false;
        setBusy(false);
      }
    },
    [payload.matchId],
  );

  // Re-send a timeout shortly after an early one (clock skew); see `send`.
  useEffect(() => {
    if (retryTick === 0) return;
    const t = setTimeout(() => void send({ type: "timeout" }), 400);
    return () => clearTimeout(t);
  }, [retryTick, send]);

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

  const view: GameView = useMemo(
    () => ({
      ...payload.view,
      deadline: payload.view.deadline === null ? null : payload.view.deadline - offset,
      busy,
      error,
    }),
    [payload.view, offset, busy, error],
  );

  return { payload, view, actions };
}
