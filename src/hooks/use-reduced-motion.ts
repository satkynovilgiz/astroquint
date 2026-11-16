"use client";

import { usePreferences } from "@/features/preferences/use-preferences";
import { useMediaQuery } from "./use-media-query";

/**
 * True when the OS asks for reduced motion OR the player turned motion down
 * in Astroquint's own settings. All continuous animation loops check this.
 */
export function useShouldReduceMotion(): boolean {
  const osReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [prefs] = usePreferences();
  return osReduced || prefs.motion === "reduced";
}
