"use client";

import { motion } from "motion/react";

const N = 10;

/** Small radial spark burst for correct answers. ~0.6s, 10 particles. */
export function Burst({ color = "#B9F46D" }: { color?: string }) {
  return (
    <span className="pointer-events-none absolute inset-0 grid place-items-center overflow-visible" aria-hidden="true">
      {Array.from({ length: N }, (_, i) => {
        const a = (i / N) * Math.PI * 2;
        const d = 46 + (i % 3) * 12;
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ background: i % 2 ? color : "var(--aq-fg)" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </span>
  );
}
