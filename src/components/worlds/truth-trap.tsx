"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { playSound } from "@/features/audio/synth";
import { riseIn, spring, staggerChildren } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";
import { Burst } from "@/components/game/burst";
import type { WorldProps } from "./types";

export function TruthTrap({ question, world, locked, submitted, reveal, onSubmit }: WorldProps<"truth-trap">) {
  const chosen = submitted?.kind === "choice" ? submitted.index : null;
  const falseIndex = reveal?.correctAnswer.kind === "choice" ? reveal.correctAnswer.index : null;

  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = ["1", "2", "3"].indexOf(e.key);
      if (idx >= 0) {
        e.preventDefault();
        playSound("select");
        onSubmit({ kind: "choice", index: idx });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, onSubmit]);

  return (
    <div className="space-y-5">
      <div>
        <p className="hud-label" style={{ color: world.ink }}>
          {question.topic}
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold sm:text-2xl">Two are true. Which one is the lie?</h2>
      </div>
      <motion.ul variants={staggerChildren(0.05)} initial="hidden" animate="visible" className="space-y-3">
        {question.statements.map((text, i) => {
          const detail = reveal?.statements?.[i];
          const isFalse = falseIndex === i;
          const isChosen = chosen === i;
          const correctPick = reveal && isChosen && isFalse;
          const wrongPick = reveal && isChosen && !isFalse;
          return (
            <motion.li key={i} variants={riseIn}>
              <motion.button
                type="button"
                disabled={locked}
                onClick={() => {
                  playSound("select");
                  onSubmit({ kind: "choice", index: i });
                }}
                whileHover={locked ? undefined : { scale: 1.01 }}
                whileTap={locked ? undefined : { scale: 0.98 }}
                transition={spring.press}
                aria-keyshortcuts={String(i + 1)}
                className={cn(
                  "panel relative w-full rounded-2xl p-4 text-left transition-[border-color,background-color] duration-[var(--dur-base)] sm:p-5",
                  !locked && "hover:border-line-strong",
                  reveal && isFalse && "border-danger/70 bg-danger/10",
                  reveal && !isFalse && "border-action/40",
                  wrongPick && "animate-shake",
                )}
                style={isChosen && !reveal ? { boxShadow: `0 0 0 2px ${world.palette.glow}` } : undefined}
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-fg/8 font-display text-sm font-bold text-fg-muted" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[1.02rem] leading-snug">{text}</span>
                  {detail && (
                    <motion.span
                      initial={{ scale: 1.8, opacity: 0, rotate: -12 }}
                      animate={{ scale: 1, opacity: 1, rotate: -6 }}
                      transition={{ ...spring.press, delay: 0.1 + i * 0.12 }}
                      className={cn(
                        "hud-label shrink-0 rounded-md border-2 px-2 py-1",
                        detail.isTrue ? "border-action text-action" : "border-danger text-danger",
                      )}
                    >
                      {detail.isTrue ? "True" : "False"}
                    </motion.span>
                  )}
                </span>
                {isChosen && reveal && (
                  <span className="mt-2 block pl-10 text-xs font-semibold text-fg-muted">Your pick{correctPick ? " ✓" : ""}</span>
                )}
                {correctPick && <Burst />}
              </motion.button>
              {detail && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ delay: 0.25 + i * 0.1 }}
                  className="overflow-hidden px-4 pt-2 text-sm leading-relaxed text-fg-muted"
                >
                  {detail.note}{" "}
                  <a href={detail.source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-fg/80 underline-offset-2 hover:underline">
                    {detail.source.publisher ?? "Source"}: {detail.source.title}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </motion.p>
              )}
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
