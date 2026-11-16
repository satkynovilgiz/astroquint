"use client";

import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { usePreferences } from "@/features/preferences/use-preferences";
import { playSound } from "@/features/audio/synth";
import { cn } from "@/lib/utils/cn";

/** Header toggle: black (default) ↔ light. Icon swaps with a small orbit spin. */
export function ThemeToggle({ className }: { className?: string }) {
  const [prefs, setPrefs] = usePreferences();
  const dark = prefs.theme === "dark";
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        setPrefs({ theme: dark ? "light" : "dark" });
        playSound("tap");
      }}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={cn(
        "relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
        >
          {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
