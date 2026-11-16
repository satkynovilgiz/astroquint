"use client";

import { useEffect, useState } from "react";

/** Whole seconds remaining until a local-clock instant. */
export function useSecondsLeft(endsAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  return endsAt === null ? null : Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function Countdown({ endsAt, label }: { endsAt: number | null; label: string }) {
  const s = useSecondsLeft(endsAt);
  if (s === null) return null;
  return (
    <span className="tabular" aria-live="off">
      {label} {s}s
    </span>
  );
}
