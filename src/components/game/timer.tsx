"use client";

import { useEffect, useRef, useState } from "react";
import { playSound } from "@/features/audio/synth";
import { cn } from "@/lib/utils/cn";

const R = 22;
const C = 2 * Math.PI * R;

/**
 * Countdown ring. Purely visual: it reads the authoritative deadline and
 * repaints via requestAnimationFrame (no React renders per frame), so it can
 * never affect scoring. Announces 10s and 5s marks to screen readers.
 */
export function Timer({ deadline, limitMs, frozen, color }: { deadline: number | null; limitMs: number; frozen: boolean; color: string }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [announce, setAnnounce] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (deadline === null) return;
    let raf = 0;
    let lastWhole = -1;
    const paint = () => {
      const remaining = Math.max(0, deadline - Date.now());
      const frac = Math.min(1, remaining / limitMs);
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(C * (1 - frac));
      const whole = Math.ceil(remaining / 1000);
      if (whole !== lastWhole) {
        lastWhole = whole;
        if (textRef.current) textRef.current.textContent = String(whole);
        if (!frozen) {
          if (whole === 10 || whole === 5) setAnnounce(`${whole} seconds left`);
          setUrgent(whole <= 5);
          if (whole <= 5 && whole > 0) playSound("tick");
        }
      }
      if (!frozen && remaining > 0) raf = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(raf);
  }, [deadline, limitMs, frozen]);

  if (deadline === null) {
    return (
      <div className="hud-label rounded-pill border border-line px-3 py-2 text-fg-muted" aria-label="Untimed round">
        No timer
      </div>
    );
  }

  return (
    <div className={cn("relative grid h-14 w-14 shrink-0 place-items-center", urgent && !frozen && "animate-[pulse-soft_1s_ease-in-out_infinite]")}>
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r={R} fill="none" stroke="var(--aq-line)" strokeWidth="4" />
        <circle
          ref={ringRef}
          cx="26"
          cy="26"
          r={R}
          fill="none"
          stroke={urgent ? "#FF7A8A" : color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          style={{ transition: "stroke 300ms" }}
        />
      </svg>
      <span ref={textRef} className={cn("tabular font-display text-lg font-bold", urgent && "text-danger")} aria-hidden="true" />
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
