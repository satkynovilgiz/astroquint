"use client";

import { motion } from "motion/react";
import { Play, Timer } from "lucide-react";
import type { WorldDefinition } from "@/features/worlds/worlds";
import { Planet } from "@/components/animations/planet";
import { Button } from "@/components/ui/button";
import { duration, ease, riseIn, staggerChildren } from "@/lib/motion/tokens";

const HOW: Record<WorldDefinition["id"], string> = {
  "pattern-break": "Spot the rule and pick what comes next. One tap locks your answer.",
  "truth-trap": "Two statements are true and one is false. Tap the false one.",
  timeline: "Put the events in order from earliest to latest, then lock it in.",
  geotap: "Read the clue, tap the country on the map, then lock it in.",
  "final-bet": "Choose your wager, then answer the hardest question of the run.",
};

/** Planet arrival card. The clock only starts when the player presses Start. */
export function WorldIntro({ world, relaxed, onBegin, waitingLabel }: { world: WorldDefinition; relaxed: boolean; onBegin?: () => void; waitingLabel?: React.ReactNode }) {
  return (
    <div className="grid items-center gap-6 py-2 sm:grid-cols-[auto_1fr] sm:gap-10 sm:py-6">
      <motion.div
        className="mx-auto w-40 sm:w-56"
        initial={{ scale: 0.55, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: duration.scene, ease: ease.arrive }}
      >
        <Planet palette={world.palette} surface={world.surface} ring={world.id === "pattern-break" || world.id === "final-bet"} spinSeconds={22} glow={1} />
      </motion.div>
      <motion.div variants={staggerChildren(0.15)} initial="hidden" animate="visible" className="text-center sm:text-left">
        <motion.p variants={riseIn} className="hud-label" style={{ color: world.ink }}>
          World {world.order} of 5 · {world.skill}
        </motion.p>
        <motion.h2 variants={riseIn} className="mt-2 font-display text-[clamp(2.25rem,8vw,3.5rem)] font-bold leading-none tracking-[-0.03em]">
          {world.name}
        </motion.h2>
        <motion.p variants={riseIn} className="mx-auto mt-4 max-w-md text-[1.05rem] leading-relaxed text-fg-muted sm:mx-0">
          {HOW[world.id]}
        </motion.p>
        <motion.p variants={riseIn} className="mt-3 inline-flex items-center gap-1.5 text-sm text-fg-muted">
          <Timer className="h-4 w-4" aria-hidden="true" />
          {relaxed ? "Relaxed mode: no timer" : `${world.timeLimitMs / 1000} seconds. Faster correct answers earn more points.`}
        </motion.p>
        <motion.div variants={riseIn} className="mt-6">
          {onBegin ? (
            <Button size="lg" autoFocus onClick={onBegin} className="w-full sm:w-auto" icon={<Play className="h-5 w-5" aria-hidden="true" />}>
              {world.id === "final-bet" ? "Place your bet" : `Start ${world.name}`}
            </Button>
          ) : (
            waitingLabel
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
