"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { FastForward } from "lucide-react";
import type { WorldDefinition } from "@/features/worlds/worlds";
import { Planet } from "@/components/animations/planet";
import { Ship } from "@/components/animations/ship";
import { requestWarp } from "@/components/animations/warp-bus";
import { playSound } from "@/features/audio/synth";
import { useShouldReduceMotion } from "@/hooks/use-reduced-motion";
import { ease } from "@/lib/motion/tokens";

const TRAVEL_MS = 1250;

/**
 * Planet-to-planet travel: the current world falls away, the ship burns, the
 * starfield jumps to warp and the next world rushes in. ~1.9s, skippable.
 */
export function Travel({ from, to, onDone }: { from: WorldDefinition; to: WorldDefinition; onDone: () => void }) {
  const reduce = useShouldReduceMotion();
  const done = useRef(false);
  const finish = useRef(onDone);
  useEffect(() => {
    finish.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const complete = () => {
      if (done.current) return;
      done.current = true;
      finish.current();
    };
    if (reduce) {
      const t = setTimeout(complete, 350);
      return () => clearTimeout(t);
    }
    requestWarp({ durationMs: TRAVEL_MS + 200, intensity: 1 });
    playSound("warp");
    const t = setTimeout(complete, TRAVEL_MS);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") complete();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [reduce]);

  const skip = () => {
    if (done.current) return;
    done.current = true;
    finish.current();
  };

  if (reduce) {
    return (
      <div className="grid min-h-[50vh] place-items-center" role="status">
        <p className="hud-label text-fg-muted">Travelling to {to.name}…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-[56vh] overflow-hidden" role="status" aria-label={`Travelling from ${from.name} to ${to.name}`}>
      {/* departing world */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-48 -translate-x-1/2 -translate-y-1/2 sm:w-64"
        initial={{ x: 0, scale: 1, opacity: 1 }}
        animate={{ x: "-55vw", scale: 0.2, opacity: 0, filter: "blur(3px)" }}
        transition={{ duration: 0.6, ease: ease.depart }}
      >
        <Planet palette={from.palette} surface={from.surface} glow={0.6} />
      </motion.div>

      {/* arriving world */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-48 -translate-x-1/2 -translate-y-1/2 sm:w-64"
        initial={{ x: "35vw", scale: 0.06, opacity: 0 }}
        animate={{ x: 0, scale: [0.06, 1.12, 1], opacity: 1 }}
        transition={{ duration: 0.75, ease: ease.arrive, delay: 0.5, times: [0, 0.75, 1] }}
      >
        <Planet palette={to.palette} surface={to.surface} glow={1} spinSeconds={20} />
      </motion.div>

      {/* Warp streaks rushing past */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="absolute h-px origin-right rounded-full"
            style={{
              top: `${8 + ((i * 37) % 84)}%`,
              right: `${(i * 23) % 40}%`,
              width: `${18 + ((i * 13) % 22)}%`,
              background: `linear-gradient(90deg, transparent, ${i % 3 === 0 ? to.palette.glow : "var(--aq-fg)"})`,
              animation: `warp-lines 0.55s ${0.12 + (i % 5) * 0.06}s var(--ease-move) both`,
            }}
          />
        ))}
      </div>

      {/* the ship: accelerates, holds, then eases into orbit */}
      <motion.div
        className="absolute left-1/2 top-[62%] w-10 -translate-x-1/2 sm:w-12"
        initial={{ x: "-30vw", scale: 0.8 }}
        animate={{ x: ["-30vw", "-4vw", "4vw", "18vw"], y: [0, -6, 4, -40], scale: [0.8, 1.15, 1.15, 0.6], opacity: [1, 1, 1, 0] }}
        transition={{ duration: TRAVEL_MS / 1000, times: [0, 0.35, 0.7, 1], ease: "easeInOut" }}
      >
        <div className="rotate-90">
          <Ship />
        </div>
        <motion.span
          className="absolute right-[70%] top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, #FFB681)" }}
          initial={{ width: 0 }}
          animate={{ width: [0, 90, 120, 0] }}
          transition={{ duration: TRAVEL_MS / 1000, times: [0, 0.35, 0.7, 1] }}
          aria-hidden="true"
        />
      </motion.div>

      <motion.div
        className="absolute inset-x-0 bottom-6 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.35 }}
      >
        <p className="hud-label" style={{ color: to.ink }}>
          Next stop · {to.code}
        </p>
        <p className="mt-1 font-display text-2xl font-bold">{to.name}</p>
      </motion.div>

      <button
        type="button"
        onClick={skip}
        className="absolute right-0 top-0 inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line px-4 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
      >
        Skip <FastForward className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
