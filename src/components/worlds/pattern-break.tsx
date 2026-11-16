"use client";

import { motion } from "motion/react";
import { duration, ease } from "@/lib/motion/tokens";
import { ChoiceGrid } from "./choice-grid";
import type { WorldProps } from "./types";

export function PatternBreak({ question, world, locked, submitted, reveal, onSubmit }: WorldProps<"pattern-break">) {
  const answerText =
    reveal?.correctAnswer.kind === "choice" ? question.options[reveal.correctAnswer.index] : null;
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-semibold text-fg-muted sm:text-2xl">{question.prompt}</h2>
      <ol className="flex flex-wrap items-center gap-2 sm:gap-3" aria-label={`Sequence: ${question.sequence.join(", ").replace("?", "unknown")}`}>
        {question.sequence.map((item, i) => {
          const missing = item === "?";
          return (
            <motion.li
              key={i}
              aria-hidden="true"
              initial={{ opacity: 0, y: 14, scale: 0.9 }}
              animate={
                reveal?.correct
                  ? // Completion wave: the solved sequence ripples left → right.
                    { opacity: 1, y: [0, -8, 0], scale: [1, 1.12, 1] }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              transition={
                reveal?.correct
                  ? { duration: 0.5, ease: ease.move, delay: 0.15 + i * 0.07 }
                  : { duration: duration.slow, ease: ease.arrive, delay: i * 0.07 }
              }
              className="tabular grid h-14 min-w-14 place-items-center rounded-2xl border border-line-strong bg-surface-2/70 px-3 font-display text-2xl font-bold sm:h-16 sm:min-w-16 sm:text-3xl"
              style={
                missing
                  ? ({
                      "--glow": world.palette.glow,
                      animation: reveal ? undefined : "tile-glow 1.6s ease-in-out infinite",
                      color: reveal ? (reveal.correct ? "#B9F46D" : world.ink) : world.ink,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              {missing && answerText ? (
                <motion.span
                  className="inline-block"
                  initial={{ rotateX: 90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                >
                  {answerText}
                </motion.span>
              ) : (
                item
              )}
            </motion.li>
          );
        })}
      </ol>
      <ChoiceGrid options={question.options} locked={locked} submitted={submitted} reveal={reveal} onSubmit={onSubmit} accent={world.palette.glow} />
    </div>
  );
}
