"use client";

import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { WORLDS } from "@/features/worlds/worlds";
import type { RoundView } from "@/features/gameplay/controller";
import { Planet } from "@/components/animations/planet";
import { spring } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

/** The five-planet route with the ship's current position and results so far. */
export function RouteProgress({ rounds, current }: { rounds: RoundView[]; current: number }) {
  return (
    <ol className="flex items-center" aria-label="Route progress">
      {WORLDS.map((w, i) => {
        const r = rounds[i];
        const done = r?.outcome != null;
        const isCurrent = i === current && !done;
        return (
          <li key={w.id} className="flex items-center">
            {i > 0 && (
              <span className="relative mx-0.5 h-px w-3 bg-line-strong sm:w-5" aria-hidden="true">
                <motion.span
                  className="absolute inset-0 origin-left bg-brand-soft"
                  initial={false}
                  animate={{ scaleX: i <= current ? 1 : 0 }}
                  transition={{ duration: 0.5 }}
                />
              </span>
            )}
            <motion.span
              className={cn("relative block w-7 sm:w-8", !done && !isCurrent && "opacity-40 grayscale-[0.4]")}
              animate={{ scale: isCurrent ? 1.15 : 1 }}
              transition={spring.settle}
            >
              <Planet palette={w.palette} surface={w.surface} spinSeconds={isCurrent ? 14 : 0} glow={isCurrent ? 0.9 : 0.3} />
              {done && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={spring.press}
                  className={cn(
                    "absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full ring-2 ring-space",
                    r.outcome === "correct" ? "bg-action text-action-fg" : "bg-danger text-space",
                  )}
                >
                  {r.outcome === "correct" ? <Check className="h-2.5 w-2.5" strokeWidth={4} /> : <X className="h-2.5 w-2.5" strokeWidth={4} />}
                </motion.span>
              )}
              <span className="sr-only">
                {w.name}: {done ? (r.outcome === "correct" ? "correct" : r.outcome === "timeout" ? "time ran out" : "incorrect") : isCurrent ? "current world" : "not visited yet"}
              </span>
            </motion.span>
          </li>
        );
      })}
    </ol>
  );
}
