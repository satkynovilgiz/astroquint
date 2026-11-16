"use client";

import { AnimatePresence, motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { usePreferences } from "@/features/preferences/use-preferences";
import { playSound } from "@/features/audio/synth";
import { duration } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

export function SoundToggle({ className }: { className?: string }) {
  const [prefs, setPrefs] = usePreferences();
  const on = prefs.sound;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      aria-pressed={on}
      aria-label={on ? "Sound on. Turn sound off" : "Sound off. Turn sound on"}
      title={on ? "Sound on" : "Sound off"}
      onClick={() => {
        setPrefs({ sound: !on });
        if (!on) playSound("toggle-on", { force: true });
      }}
      className={cn(
        "relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg",
        on && "border-action/40 text-action",
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={on ? "on" : "off"}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: duration.base }}
        >
          {on ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
