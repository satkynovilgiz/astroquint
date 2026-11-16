"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { usePreferences } from "@/features/preferences/use-preferences";

/**
 * App-wide client providers.
 * - MotionConfig: Motion animations honour the OS setting, or are forced off
 *   when the player picks "Reduce motion" in Astroquint.
 * - Mirrors that choice onto <html data-motion> so CSS animations follow too.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [prefs] = usePreferences();

  useEffect(() => {
    document.documentElement.dataset.motion = prefs.motion;
  }, [prefs.motion]);

  return <MotionConfig reducedMotion={prefs.motion === "reduced" ? "always" : "user"}>{children}</MotionConfig>;
}
