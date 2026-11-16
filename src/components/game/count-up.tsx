"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { useShouldReduceMotion } from "@/hooks/use-reduced-motion";
import { ease } from "@/lib/motion/tokens";

/** Number that counts up from `from` to `to` once mounted (instant under reduced motion). */
export function CountUp({ to, from = 0, duration = 1.4, delay = 0.2 }: { to: number; from?: number; duration?: number; delay?: number }) {
  const reduce = useShouldReduceMotion();
  const mv = useMotionValue(reduce ? to : from);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString("en-US"));
  useEffect(() => {
    if (reduce) {
      mv.set(to);
      return;
    }
    const c = animate(mv, to, { duration, ease: ease.arrive, delay });
    return () => c.stop();
  }, [mv, to, reduce, duration, delay]);
  return <motion.span>{text}</motion.span>;
}
