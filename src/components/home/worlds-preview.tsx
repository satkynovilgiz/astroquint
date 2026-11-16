"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Timer } from "lucide-react";
import { WORLDS } from "@/features/worlds/worlds";
import { Planet } from "@/components/animations/planet";
import { riseIn, spring, staggerChildren, stagger } from "@/lib/motion/tokens";

export function WorldsPreview() {
  return (
    <section aria-labelledby="worlds-title" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:pt-20">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hud-label text-fg-muted">Your route</p>
          <h2 id="worlds-title" className="mt-2 font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
            Every game visits all five worlds
          </h2>
        </div>
        <Link
          href="/how-to-play"
          transitionTypes={["nav-forward"]}
          className="min-h-11 content-center text-sm font-medium text-action underline-offset-4 hover:underline"
        >
          How each world works →
        </Link>
      </div>

      <motion.ol
        variants={staggerChildren(0, stagger.tight)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        {WORLDS.map((world) => (
          <motion.li key={world.id} variants={riseIn}>
            <motion.div whileHover="hover" whileTap="hover" className="h-full">
              <Link
                href={`/how-to-play#${world.id}`}
                transitionTypes={["nav-forward"]}
                className="panel group relative flex h-full items-center gap-4 overflow-hidden rounded-card p-4 transition-colors hover:border-line-strong lg:flex-col lg:items-start lg:gap-5 lg:p-5"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px opacity-70"
                  style={{ background: `linear-gradient(90deg, transparent, ${world.palette.glow}, transparent)` }}
                />
                <motion.div
                  variants={{ hover: { scale: 1.08, rotate: -6 } }}
                  transition={spring.settle}
                  className="w-14 lg:w-20"
                >
                  <Planet palette={world.palette} surface={world.surface} spinSeconds={30} glow={0.5} />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className="hud-label" style={{ color: world.palette.text }}>
                    {world.code} · {world.skill}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold">{world.name}</h3>
                  <p className="mt-1 text-sm leading-snug text-fg-muted">{world.summary}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-fg-muted">
                    <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="tabular">{world.timeLimitMs / 1000}s</span>
                  </p>
                </div>
              </Link>
            </motion.div>
          </motion.li>
        ))}
      </motion.ol>
    </section>
  );
}
