"use client";

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ease } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

/** Rolling score with a floating "+N" / "−N" chip on every change. */
export function ScoreCounter({ value, className, label = "Score" }: { value: number; className?: string; label?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("en-US"));
  const prev = useRef(value);
  const [delta, setDelta] = useState<{ id: number; n: number } | null>(null);

  useEffect(() => {
    const diff = value - prev.current;
    prev.current = value;
    if (diff === 0) return;
    const controls = animate(mv, value, { duration: 0.9, ease: ease.arrive });
    const id = Date.now();
    const t1 = setTimeout(() => setDelta({ id, n: diff }), 0);
    const t2 = setTimeout(() => setDelta((d) => (d?.id === id ? null : d)), 1400);
    return () => {
      controls.stop();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [value, mv]);

  return (
    <div className={cn("relative text-right", className)}>
      <p className="hud-label text-fg-muted">{label}</p>
      <motion.p className="tabular font-display text-2xl font-bold leading-none" aria-live="polite" aria-atomic="true">
        <span className="sr-only">{value} points</span>
        <motion.span aria-hidden="true">{text}</motion.span>
      </motion.p>
      <AnimatePresence>
        {delta && (
          <motion.span
            key={delta.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: -2 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4, ease: ease.arrive }}
            className={cn(
              "tabular absolute -top-4 right-0 rounded-pill px-2 py-0.5 text-xs font-bold",
              delta.n > 0 ? "bg-action text-action-fg" : "bg-danger/90 text-space",
            )}
            aria-hidden="true"
          >
            {delta.n > 0 ? "+" : "−"}
            {Math.abs(delta.n)}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
