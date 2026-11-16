"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiRequestError } from "@/lib/api/client";
import { describeError, type FriendlyError } from "@/lib/api/errors";
import type { Answer } from "@/features/questions/types";
import type { PartyView } from "./engine";

const POLL_MS = 2_500;

export type PartyCommand =
  | { type: "join"; name: string }
  | { type: "leave" }
  | { type: "ready"; ready: boolean }
  | { type: "start" }
  | { type: "wager"; wager: number }
  | { type: "answer"; answer: Answer }
  | { type: "next" }
  | { type: "kick"; playerId: string }
  | { type: "rematch" };

/**
 * Live room state. Change notifications (SSE locally, Supabase Realtime when
 * configured) only trigger a re-fetch; the API response is always the truth.
 * Polling doubles as presence and keeps things moving if a push is missed.
 */
export function usePartyRoom(code: string) {
  const [view, setView] = useState<PartyView | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<FriendlyError | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const inflight = useRef<AbortController | null>(null);

  // Newest request wins: a fresh refresh aborts any in-flight one, so a push
  // that arrives mid-request is never answered with stale state.
  const refresh = useCallback(async () => {
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    const sent = Date.now();
    try {
      const v = await api<PartyView>(`/api/party/${code}`, { signal: ctrl.signal });
      setOffset(v.serverNow - (sent + Date.now()) / 2);
      setView(v);
      setError(null);
      setOnline(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (err instanceof ApiRequestError && err.status === 0) setOnline(false);
      else setError(describeError(err, "party-room"));
    }
  }, [code]);

  // Initial load + polling.
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const t = setInterval(() => void refresh(), POLL_MS);
    const onVis = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onVis);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onVis);
    };
  }, [refresh]);

  // Push notifications. Pings carry no data and anyone holding the public key
  // could send them, so bursts are coalesced into at most one refresh / 400ms.
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPush = useCallback(() => {
    if (pushTimer.current) return;
    pushTimer.current = setTimeout(() => {
      pushTimer.current = null;
      void refresh();
    }, 400);
  }, [refresh]);
  useEffect(() => () => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
  }, []);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      let unsub = () => {};
      let cancelled = false;
      void import("@supabase/supabase-js").then(({ createClient }) => {
        if (cancelled) return;
        const client = createClient(url, anon, { auth: { persistSession: false } });
        const channel = client.channel(`room:${code}`).on("broadcast", { event: "changed" }, onPush).subscribe();
        unsub = () => void client.removeChannel(channel);
      });
      return () => {
        cancelled = true;
        unsub();
      };
    }
    if (typeof EventSource === "undefined") return;
    const es = new EventSource(`/api/party/${code}/events`);
    es.addEventListener("changed", onPush);
    return () => es.close();
  }, [code, onPush]);

  // Fetch right when the current phase is due to end (server advances it).
  useEffect(() => {
    if (!view?.phaseEndsAt) return;
    const wait = view.phaseEndsAt - offset - Date.now() + 60;
    const t = setTimeout(() => void refresh(), Math.max(0, wait));
    return () => clearTimeout(t);
  }, [view?.phaseEndsAt, offset, refresh]);

  const send = useCallback(
    async (cmd: PartyCommand) => {
      setBusy(true);
      setActionError(null);
      const sent = Date.now();
      try {
        const v = await api<PartyView>(`/api/party/${code}/actions`, { body: cmd });
        setOffset(v.serverNow - (sent + Date.now()) / 2);
        setView(v);
        return true;
      } catch (err) {
        const e = describeError(err, "party-room");
        setActionError(e.kind === "state" || e.kind === "input" ? e.message : `${e.title}. ${e.message}`);
        void refresh();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, refresh],
  );

  const toLocal = useCallback((serverTime: number | null) => (serverTime === null ? null : serverTime - offset), [offset]);

  return useMemo(
    () => ({ view, error, actionError, busy, online, send, refresh, toLocal, clearActionError: () => setActionError(null) }),
    [view, error, actionError, busy, online, send, refresh, toLocal],
  );
}
