"use client";

import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Clock, ExternalLink, Flag, XCircle } from "lucide-react";
import type { Reveal } from "@/features/questions/types";
import type { RoundView } from "@/features/gameplay/controller";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

export function RevealPanel({
  reveal,
  round,
  nextLabel,
  onNext,
  isLast,
}: {
  reveal: Reveal;
  round: RoundView;
  nextLabel: string;
  onNext: () => void;
  isLast: boolean;
}) {
  const outcome = round.outcome;
  const tone = outcome === "correct" ? "good" : "bad";
  const Icon = outcome === "correct" ? CheckCircle2 : outcome === "timeout" ? Clock : XCircle;
  const title = outcome === "correct" ? "Correct!" : outcome === "timeout" ? "Time's up" : "Not quite";
  const isFinal = round.worldId === "final-bet";

  return (
    <motion.section
      aria-live="polite"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.settle}
      className={cn("panel mt-6 rounded-[1.5rem] p-5 sm:p-6", tone === "good" ? "border-action/40" : "border-danger/30")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={cn("flex items-center gap-2 font-display text-2xl font-bold", tone === "good" ? "text-action" : "text-danger")}>
          <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={spring.press}>
            <Icon className="h-7 w-7" aria-hidden="true" />
          </motion.span>
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("tabular rounded-pill px-3 py-1 font-display font-bold", round.points > 0 ? "bg-action text-action-fg" : "bg-fg/10 text-fg-muted")}>
            +{round.points} pts
          </span>
          {isFinal && round.wagerDelta !== null && (
            <span
              className={cn(
                "tabular rounded-pill px-3 py-1 font-display font-bold",
                round.wagerDelta > 0 ? "bg-w5 text-space" : round.wagerDelta < 0 ? "bg-danger text-space" : "bg-fg/10 text-fg-muted",
              )}
            >
              Wager {round.wagerDelta >= 0 ? "+" : "−"}
              {Math.abs(round.wagerDelta)}
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 leading-relaxed text-fg/90">{reveal.explanation}</p>
      {reveal.sources.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
          {reveal.sources.slice(0, 4).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 underline-offset-2 hover:text-fg hover:underline">
                {s.publisher ? `${s.publisher}: ` : ""}
                {s.title}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
      <Button
        size="lg"
        autoFocus
        onClick={onNext}
        className="mt-5 w-full sm:w-auto"
        icon={isLast ? <Flag className="h-5 w-5" aria-hidden="true" /> : <ArrowRight className="h-5 w-5" aria-hidden="true" />}
      >
        {nextLabel}
      </Button>
    </motion.section>
  );
}
