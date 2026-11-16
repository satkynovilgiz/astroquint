"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api/client";
import { LeaderboardTable, type LeaderRow } from "./leaderboard-table";

interface Board {
  date: string;
  today: string;
  number: number;
  rows: LeaderRow[];
  you: { score: number; rank: number; total: number } | null;
}

const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export function LeaderboardView() {
  const [date, setDate] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const b = await api<Board>(`/api/leaderboard${date ? `?date=${date}` : ""}`, { signal: ctrl.signal });
        setBoard(b);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Couldn't load the leaderboard.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => ctrl.abort();
  }, [date]);

  const current = board?.date ?? date;
  const label = current ? new Date(`${current}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }) : "";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => board && setDate(shift(board.date, -1))}
          disabled={!board || board.number <= 1 || loading}
          aria-label="Previous day"
          className="grid h-11 w-11 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="text-center" aria-live="polite">
          <p className="hud-label text-w5">Daily Orbit {board ? `#${board.number}` : ""}</p>
          <p className="font-display text-lg font-semibold">
            {label}
            {board && board.date === board.today ? " · Today" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => board && setDate(shift(board.date, 1))}
          disabled={!board || board.date >= board.today || loading}
          aria-label="Next day"
          className="grid h-11 w-11 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {board?.you && (
        <p className="mb-4 rounded-2xl border border-action/40 bg-action/10 px-4 py-3">
          Your ranked score: <strong className="tabular">{board.you.score}</strong>, rank <strong>#{board.you.rank}</strong> of {board.you.total}
        </p>
      )}

      {error && (
        <p role="alert" className="panel rounded-2xl p-4 text-danger">
          {error}
        </p>
      )}
      {loading && !board && (
        <p className="inline-flex items-center gap-2 text-fg-muted" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading rankings…
        </p>
      )}
      {board && (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <LeaderboardTable rows={board.rows} empty="No ranked results for this day yet." />
        </div>
      )}
      <p className="mt-4 text-xs text-fg-muted">Only ranked Daily Orbit results count. Ties share a rank. Every score is calculated on the server.</p>
    </div>
  );
}
