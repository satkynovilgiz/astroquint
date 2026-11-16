"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Coins, Lock, ShieldAlert } from "lucide-react";
import { MAX_WAGER, maxWager } from "@/features/scoring/scoring";
import { playSound } from "@/features/audio/synth";
import { useShouldReduceMotion } from "@/hooks/use-reduced-motion";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";
import { ChoiceGrid } from "./choice-grid";
import type { WorldProps } from "./types";

/** Step 1: choose and confirm a wager. */
export function WagerPicker({ score, onLock, busy }: { score: number; onLock: (wager: number) => void; busy?: boolean }) {
  const max = maxWager(score);
  const [wager, setWager] = useState(Math.min(max, Math.round(max / 2 / 10) * 10));
  const [confirming, setConfirming] = useState(false);
  const presets = [
    { label: "Nothing", value: 0 },
    { label: "Quarter", value: Math.round(max / 4) },
    { label: "Half", value: Math.round(max / 2) },
    { label: "All in", value: max },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="hud-label text-w5">The last world</p>
        <h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">How much will you risk?</h2>
        <p className="mt-2 max-w-prose text-fg-muted">
          Get the final question right and you win the round points <em>plus</em> your wager. Get it wrong or run out of time
          and you lose the wager. You can bet up to {MAX_WAGER}, but never more than your score.
        </p>
      </div>

      <div className="panel rounded-2xl p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="hud-label text-fg-muted">Your wager</p>
            <motion.p key={wager} initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={spring.press} className="tabular font-display text-5xl font-bold text-w5">
              {wager}
            </motion.p>
          </div>
          <div className="text-right text-sm text-fg-muted">
            <p>
              Balance <span className="tabular font-semibold text-fg">{score}</span>
            </p>
            <p>
              Max bet <span className="tabular font-semibold text-fg">{max}</span>
            </p>
          </div>
        </div>
        <label className="mt-5 block">
          <span className="sr-only">Wager amount, from 0 to {max}</span>
          <input
            type="range"
            min={0}
            max={max}
            step={1}
            value={wager}
            disabled={max === 0 || confirming}
            onChange={(e) => setWager(Number(e.target.value))}
            className="h-11 w-full cursor-pointer accent-[#F5C451] disabled:cursor-not-allowed"
          />
        </label>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={confirming}
              onClick={() => {
                setWager(p.value);
                playSound("tap");
              }}
              className={cn(
                "min-h-11 rounded-xl border px-1 text-sm font-medium transition-colors",
                wager === p.value ? "border-w5 bg-w5/15 text-fg" : "border-line text-fg-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {max === 0 && <p className="mt-3 text-sm text-fg-muted">You have no points to bet this time, so your wager is 0. You can still win the round points.</p>}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!confirming ? (
          <motion.div key="set" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Button size="lg" className="w-full sm:w-auto" onClick={() => setConfirming(true)} icon={<Coins className="h-5 w-5" aria-hidden="true" />}>
              Bet {wager} points
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            role="alertdialog"
            aria-labelledby="confirm-wager"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-w5/40 bg-w5/10 p-4"
          >
            <p id="confirm-wager" className="flex items-start gap-2 font-medium">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-w5" aria-hidden="true" />
              Lock in {wager} points? You can&apos;t change it once the question appears.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                autoFocus
                disabled={busy}
                onClick={() => {
                  playSound("lock");
                  onLock(wager);
                }}
                icon={<Lock className="h-4 w-4" aria-hidden="true" />}
              >
                Lock wager &amp; reveal question
              </Button>
              <Button size="lg" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                Change amount
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SUSPENSE_MS = 900;

/** Step 2: the final question, with a brief suspense beat before the verdict. */
export function FinalBetQuestion({ question, world, locked, submitted, reveal, onSubmit, wager }: WorldProps<"final-bet"> & { wager: number }) {
  const reduce = useShouldReduceMotion();
  const [shown, setShown] = useState<string | null>(null);
  const revealKey = reveal ? question.id : null;
  const verdictShown = reveal !== null && (reduce || shown === revealKey);

  useEffect(() => {
    if (!revealKey || reduce) return;
    const t = setTimeout(() => {
      setShown(revealKey);
      playSound(reveal?.correct ? "reward" : "incorrect");
    }, SUSPENSE_MS);
    return () => clearTimeout(t);
  }, [revealKey, reduce, reveal?.correct]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="hud-label text-w5">Final question</p>
        <p className="inline-flex items-center gap-1.5 rounded-pill border border-w5/40 bg-w5/10 px-3 py-1 text-sm">
          <Coins className="h-4 w-4 text-w5" aria-hidden="true" />
          <span className="tabular font-semibold">{wager}</span> at stake
        </p>
      </div>
      <h2 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl">{question.prompt}</h2>
      <ChoiceGrid
        options={question.options}
        locked={locked}
        submitted={submitted}
        reveal={reveal}
        onSubmit={onSubmit}
        accent={world.palette.glow}
        hideOutcome={!verdictShown}
      />
      <AnimatePresence>
        {reveal && !verdictShown && (
          <motion.div
            key="suspense"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-3 py-2 text-w5"
            role="status"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-3 w-3 rounded-full bg-w5"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
            <span className="hud-label">Checking your answer…</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Whether the Final Bet verdict is still being held back (for the reveal panel). */
export const FINAL_SUSPENSE_MS = SUSPENSE_MS;
