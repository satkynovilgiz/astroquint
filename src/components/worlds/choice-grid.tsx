"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { Check, X } from "lucide-react";
import type { Answer, Reveal } from "@/features/questions/types";
import { playSound } from "@/features/audio/synth";
import { riseIn, spring, staggerChildren, stagger } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";
import { Burst } from "@/components/game/burst";

const LETTERS = ["A", "B", "C", "D"];

/**
 * Four-option answer grid used by Pattern Break and Final Bet.
 * Tap/click or press A–D / 1–4. One tap locks the answer.
 */
export function ChoiceGrid({
  options,
  locked,
  submitted,
  reveal,
  onSubmit,
  accent,
  hideOutcome = false,
}: {
  options: string[];
  locked: boolean;
  submitted: Answer | null;
  reveal: Reveal | null;
  onSubmit: (a: Answer) => void;
  accent: string;
  /** Final Bet holds the verdict back for its dramatic reveal. */
  hideOutcome?: boolean;
}) {
  const chosen = submitted?.kind === "choice" ? submitted.index : null;
  const correctIndex = reveal?.correctAnswer.kind === "choice" ? reveal.correctAnswer.index : null;
  const showOutcome = reveal !== null && !hideOutcome;

  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest?.("input, textarea, select")) return;
      const k = e.key.toUpperCase();
      const idx = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : ["1", "2", "3", "4"].indexOf(k);
      if (idx >= 0 && idx < options.length) {
        e.preventDefault();
        playSound("select");
        onSubmit({ kind: "choice", index: idx });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, options.length, onSubmit]);

  return (
    <motion.ul
      variants={staggerChildren(0.05, stagger.tight)}
      initial="hidden"
      animate="visible"
      className="grid gap-3 sm:grid-cols-2"
      aria-label="Answer options"
    >
      {options.map((opt, i) => {
        const isChosen = chosen === i;
        const isCorrect = showOutcome && correctIndex === i;
        const isWrongChoice = showOutcome && isChosen && correctIndex !== i;
        return (
          <motion.li key={`${i}-${opt}`} variants={riseIn}>
            <motion.button
              type="button"
              disabled={locked}
              onClick={() => {
                playSound("select");
                onSubmit({ kind: "choice", index: i });
              }}
              whileHover={locked ? undefined : { scale: 1.015 }}
              whileTap={locked ? undefined : { scale: 0.97 }}
              transition={spring.press}
              aria-keyshortcuts={`${LETTERS[i]} ${i + 1}`}
              className={cn(
                "panel relative flex min-h-16 w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-[border-color,background-color,opacity] duration-[var(--dur-base)]",
                !locked && "hover:border-line-strong",
                isChosen && !showOutcome && "border-transparent",
                isCorrect && "border-action bg-action/15",
                isWrongChoice && "animate-shake border-danger bg-danger/10",
                showOutcome && !isCorrect && !isWrongChoice && "opacity-50",
              )}
              style={isChosen && !showOutcome ? { boxShadow: `0 0 0 2px ${accent}, 0 0 24px -6px ${accent}` } : undefined}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-sm font-bold",
                  isCorrect ? "bg-action text-action-fg" : isWrongChoice ? "bg-danger text-space" : "bg-white/8 text-fg-muted",
                )}
                style={isChosen && !showOutcome ? { background: accent, color: "#0B1020" } : undefined}
              >
                {isCorrect ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : isWrongChoice ? <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : LETTERS[i]}
              </span>
              <span className="tabular font-display text-xl font-semibold">{opt}</span>
              {(isCorrect || isWrongChoice) && <span className="sr-only">{isCorrect ? ", correct answer" : ", your answer, incorrect"}</span>}
              {isCorrect && isChosen && <Burst />}
            </motion.button>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
