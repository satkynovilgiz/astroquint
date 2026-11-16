"use client";

import { motion } from "motion/react";
import { Users } from "lucide-react";
import { siteConfig } from "@/lib/config/site";
import { riseIn, riseInVisible, staggerChildren } from "@/lib/motion/tokens";
import { ButtonLink } from "@/components/ui/button";
import { OrbitSystem } from "@/components/animations/orbit-system";
import { Asteroids } from "@/components/animations/asteroids";
import { LaunchButton } from "./launch-button";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative">
      <Asteroids />
      <div className="mx-auto grid max-w-6xl items-center gap-2 px-4 pt-2 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pt-8">
        <OrbitSystem className="mx-auto -my-[8%] w-[min(92vw,440px)] lg:order-2 lg:my-0 lg:w-full lg:max-w-[560px]" />

        <motion.div
          variants={staggerChildren(0.15)}
          initial="hidden"
          animate="visible"
          className="relative z-10 text-center lg:text-left"
        >
          <motion.p variants={riseIn} className="hud-label mb-4 inline-flex items-center gap-2 text-brand-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-action shadow-[0_0_10px_2px_rgb(185_244_109/0.7)]" aria-hidden="true" />
            A five-world puzzle odyssey
          </motion.p>
          <motion.h1
            id="hero-title"
            variants={riseInVisible}
            className="font-display text-[clamp(2.5rem,9vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.035em] text-balance"
          >
            Five Worlds.
            <br />
            <span className="bg-gradient-to-r from-brand-soft via-[#d9c9ff] to-action bg-clip-text text-transparent">
              One Brilliant Mind.
            </span>
          </motion.h1>
          <motion.p
            variants={riseIn}
            className="mx-auto mt-5 max-w-md text-[1.05rem] leading-relaxed text-fg-muted text-pretty lg:mx-0 lg:text-lg"
          >
            {siteConfig.description}
          </motion.p>
          <motion.div
            variants={riseIn}
            className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <LaunchButton />
            <ButtonLink
              href="/party"
              transitionTypes={["nav-forward"]}
              variant="secondary"
              size="lg"
              icon={<Users className="h-5 w-5" aria-hidden="true" />}
            >
              Challenge Friends
            </ButtonLink>
          </motion.div>
          <motion.p variants={riseIn} className="mt-5 text-sm text-fg-muted">
            No account needed · About 3 minutes a game
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
