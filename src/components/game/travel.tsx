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

const TRAVEL_MS = 1900;

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
        animate={{ x: "-70vw", scale: 0.25, opacity: 0 }}
        transition={{ duration: 1.0, ease: ease.depart }}
      >
        <Planet palette={from.palette} surface={from.surface} glow={0.6} />
      </motion.div>

      {/* arriving world */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-48 -translate-x-1/2 -translate-y-1/2 sm:w-64"
        initial={{ x: "45vw", scale: 0.05, opacity: 0 }}
        animate={{ x: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.95, ease: ease.arrive, delay: 0.85 }}
      >
        <Planet palette={to.palette} surface={to.surface} glow={1} spinSeconds={20} />
      </motion.div>

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
        transition={{ delay: 0.9, duration: 0.4 }}
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
