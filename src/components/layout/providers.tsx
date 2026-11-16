"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { usePreferences } from "@/features/preferences/use-preferences";
import { THEME_COLORS } from "./theme-script";

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

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = prefs.theme;
    root.style.colorScheme = prefs.theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLORS[prefs.theme]));
  }, [prefs.theme]);

  return <MotionConfig reducedMotion={prefs.motion === "reduced" ? "always" : "user"}>{children}</MotionConfig>;
}
