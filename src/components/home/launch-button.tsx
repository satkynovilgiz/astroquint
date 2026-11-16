"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Rocket } from "lucide-react";
import { ButtonLink, type ButtonSize } from "@/components/ui/button";
import { requestWarp } from "@/components/animations/warp-bus";
import { playSound } from "@/features/audio/synth";
import { useShouldReduceMotion } from "@/hooks/use-reduced-motion";
import { ease } from "@/lib/motion/tokens";

const LAUNCH_MS = 650;

/**
 * "Start Playing": the starfield jumps to warp and a bloom rushes outward,
 * then we navigate with the `warp` view transition. Total ≈ 0.65s; any click
 * or key during the launch skips straight to the destination. Reduced motion
 * navigates immediately.
 */
export function LaunchButton({
  href = "/play",
  label = "Start Playing",
  size = "lg",
  className,
}: {
  href?: string;
  label?: string;
  size?: ButtonSize;
  className?: string;
}) {
  const router = useRouter();
  const reduce = useShouldReduceMotion();
  const [launching, setLaunching] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    router.prefetch(href);
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [router, href]);

  const go = () => {
    timers.current.forEach(clearTimeout);
    router.push(href, { transitionTypes: ["warp"] });
    // The page may be kept alive (hidden) for back navigation: reset overlay.
    timers.current = [window.setTimeout(() => setLaunching(false), 400)];
  };

  return (
    <>
      <ButtonLink
        href={href}
        size={size}
        className={className}
        icon={<Rocket className="h-5 w-5" aria-hidden="true" />}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          if (launching) return go();
          if (reduce) return go();
          setLaunching(true);
          playSound("launch");
          requestWarp({ durationMs: 1300, intensity: 1 });
          timers.current.push(window.setTimeout(go, LAUNCH_MS));
        }}
      >
        {label}
      </ButtonLink>

      <AnimatePresence>
        {launching && (
          <motion.div
            key="launch"
            className="fixed inset-0 z-[60] cursor-pointer"
            onClick={go}
            role="presentation"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <motion.div
              className="absolute left-1/2 top-1/2 h-[22vmax] w-[22vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgb(248 250 255 / 0.95) 0%, rgb(185 244 109 / 0.55) 22%, rgb(145 103 244 / 0.45) 48%, transparent 70%)",
              }}
              initial={{ scale: 0.05, opacity: 0 }}
              animate={{ scale: 7, opacity: [0, 0.9, 1] }}
              transition={{ duration: LAUNCH_MS / 1000, ease: ease.depart }}
            />
            <motion.div
              className="absolute inset-0 bg-space"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.92] }}
              transition={{ duration: LAUNCH_MS / 1000, times: [0, 0.6, 1] }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
