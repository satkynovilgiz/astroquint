"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CalendarClock, Timer, Users, Rocket } from "lucide-react";
import type { ReactNode } from "react";
import { riseIn, spring, staggerChildren } from "@/lib/motion/tokens";
import { formatCountdown, msUntilNextUtcDay } from "@/features/daily/time";
import { playSound } from "@/features/audio/synth";
import { useNow } from "@/hooks/use-now";
import { DailyArt, PartyArt, SoloArt } from "./mode-art";

interface Mode {
  id: string;
  href: string;
  name: string;
  kicker: string;
  description: string;
  accent: string;
  art: ReactNode;
  meta: ReactNode;
  cta: string;
}

function DailyCountdown() {
  const now = useNow();
  return (
    <span className="inline-flex items-center gap-1.5">
      <CalendarClock className="h-4 w-4" aria-hidden="true" />
      New orbit in{" "}
      <span className="tabular font-medium text-fg" aria-live="off">
        {now === null ? "--:--:--" : formatCountdown(msUntilNextUtcDay(now))}
      </span>
    </span>
  );
}

const MODES: Mode[] = [
  {
    id: "solo",
    href: "/play/solo",
    name: "Solo Orbit",
    kicker: "Play now",
    description: "Fly all five worlds at your own pace. New questions every run, no account needed.",
    accent: "#B9F46D",
    art: <SoloArt />,
    meta: (
      <span className="inline-flex items-center gap-1.5">
        <Timer className="h-4 w-4" aria-hidden="true" />5 worlds · about 3 min
      </span>
    ),
    cta: "Launch solo",
  },
  {
    id: "daily",
    href: "/daily",
    name: "Daily Orbit",
    kicker: "Same for everyone",
    description: "One shared route per day. Everyone gets the same questions, and you get one ranked attempt.",
    accent: "#F5C451",
    art: <DailyArt />,
    meta: <DailyCountdown />,
    cta: "Today's orbit",
  },
  {
    id: "party",
    href: "/party",
    name: "Party Mode",
    kicker: "2–8 players",
    description: "Open a private room, share the invite code, and race your friends through the same five worlds.",
    accent: "#3DD6C4",
    art: <PartyArt />,
    meta: (
      <span className="inline-flex items-center gap-1.5">
        <Users className="h-4 w-4" aria-hidden="true" />
        Live, synchronized rounds
      </span>
    ),
    cta: "Open a room",
  },
];

export function ModeSelect() {
  return (
    <motion.ul
      variants={staggerChildren(0.1)}
      initial="hidden"
      animate="visible"
      className="grid gap-4 md:grid-cols-3"
    >
      {MODES.map((mode) => (
        <motion.li key={mode.id} variants={riseIn}>
          <motion.div
            initial="rest"
            whileHover="hover"
            whileTap="press"
            animate="rest"
            variants={{ rest: { y: 0 }, hover: { y: -6 }, press: { scale: 0.98 } }}
            transition={spring.settle}
            className="h-full"
          >
            <Link
              href={mode.href}
              transitionTypes={["nav-forward"]}
              onClick={() => playSound("select")}
              className="panel group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] p-5 transition-colors hover:border-line-strong sm:p-6"
              aria-describedby={`${mode.id}-desc`}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl transition-opacity duration-[var(--dur-slow)] group-hover:opacity-50"
                style={{ background: mode.accent }}
              />
              <div className="flex items-start gap-4 md:flex-col">
                <motion.div
                  variants={{ rest: { scale: 1, rotate: 0 }, hover: { scale: 1.05, rotate: -4 } }}
                  transition={spring.settle}
                  className="w-24 shrink-0 sm:w-28 md:mx-auto md:w-44"
                >
                  {mode.art}
                </motion.div>
                <div className="min-w-0">
                  <p className="hud-label" style={{ color: mode.accent }}>
                    {mode.kicker}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold tracking-[-0.02em]">{mode.name}</h2>
                  <p id={`${mode.id}-desc`} className="mt-2 text-[0.95rem] leading-relaxed text-fg-muted">
                    {mode.description}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-1 flex-col justify-end gap-4">
                <p className="text-sm text-fg-muted">{mode.meta}</p>
                <span
                  className="inline-flex min-h-12 items-center justify-between rounded-pill border border-line-strong px-5 font-display font-semibold transition-colors group-hover:border-transparent group-hover:bg-(--accent) group-hover:text-action-fg"
                  style={{ ["--accent" as string]: mode.accent }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {mode.id === "solo" && <Rocket className="h-4 w-4" aria-hidden="true" />}
                    {mode.cta}
                  </span>
                  <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-[var(--dur-base)] group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </motion.div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
