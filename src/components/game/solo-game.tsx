"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { Loader2, Play, RotateCcw, Rocket } from "lucide-react";
import { WORLDS } from "@/features/worlds/worlds";
import { useSoloGame } from "@/features/gameplay/use-solo-game";
import { useHydrated } from "@/hooks/use-hydrated";
import { Planet } from "@/components/animations/planet";
import { requestWarp } from "@/components/animations/warp-bus";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { playSound } from "@/features/audio/synth";
import { riseIn, riseInVisible, staggerChildren } from "@/lib/motion/tokens";
import { GameScreen } from "./game-screen";
import { ErrorNotice } from "@/components/ui/error-notice";
import type { FriendlyError } from "@/lib/api/errors";

export function SoloGameRoot() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-fg-muted" role="status">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Preparing launch…
        </span>
      </div>
    );
  }
  return <SoloGame />;
}

function SoloGame() {
  const { view, actions, start, quit, busy, error, relaxed: runRelaxed } = useSoloGame();
  const [relaxed, setRelaxed] = useState(false);

  const launch = (r: boolean) => {
    playSound("launch");
    requestWarp({ durationMs: 900, intensity: 0.7 });
    void start(r);
  };

  if (!view) {
    return <SoloLobby relaxed={relaxed} setRelaxed={setRelaxed} onLaunch={() => launch(relaxed)} busy={busy} error={error} />;
  }

  // A run saved mid-flight on this device: offer resume (only shown at an intro).
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <GameScreen
        view={view}
        actions={actions}
        resultsTitle={runRelaxed ? "Solo Orbit · Relaxed" : "Solo Orbit"}
        onPlayAgain={() => launch(runRelaxed)}
      />
      {view.phase !== "complete" && (
        <div className="mx-auto mt-2 flex max-w-3xl justify-end pb-6">
          <button
            type="button"
            onClick={quit}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-3 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Abandon run
          </button>
        </div>
      )}
    </div>
  );
}

function SoloLobby({ relaxed, setRelaxed, onLaunch, busy, error }: { relaxed: boolean; setRelaxed: (v: boolean) => void; onLaunch: () => void; busy: boolean; error: FriendlyError | null }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 sm:pt-8">
      <motion.div variants={staggerChildren(0.05)} initial="hidden" animate="visible">
        <motion.p variants={riseIn} className="hud-label text-action">
          Solo Orbit
        </motion.p>
        <motion.h1 variants={riseInVisible} className="mt-2 font-display text-[clamp(2.25rem,7vw,3.5rem)] font-bold leading-none tracking-[-0.03em]">
          Five worlds. One run.
        </motion.h1>
        <motion.p variants={riseIn} className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-fg-muted">
          Each world is a different kind of challenge. Correct answers score 100 points, and answering quickly adds a bonus of up
          to 100. At the last world you can bet your points.
        </motion.p>

        <motion.ol variants={riseIn} className="mt-8 grid grid-cols-5 gap-2 sm:gap-4" aria-label="Your route">
          {WORLDS.map((w, i) => (
            <li key={w.id} className="flex flex-col items-center text-center">
              <motion.div
                className="w-full max-w-20"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 + i * 0.08 }}
              >
                <Planet palette={w.palette} surface={w.surface} spinSeconds={24 + i * 3} glow={0.7} />
              </motion.div>
              <span className="hud-label mt-2 hidden sm:block" style={{ color: w.palette.text }}>
                {w.code}
              </span>
              <span className="mt-1 text-[0.7rem] font-medium leading-tight sm:text-sm">{w.name}</span>
            </li>
          ))}
        </motion.ol>

        <motion.div variants={riseIn} className="panel mt-8 rounded-2xl p-2">
          <Switch
            checked={relaxed}
            onChange={setRelaxed}
            label="Relaxed mode"
            description="No timers and no speed bonus. Take as long as you need."
            icon={<Play className="h-4 w-4" />}
          />
        </motion.div>

        <motion.div variants={riseIn} className="mt-6">
          <Button size="lg" onClick={onLaunch} disabled={busy} className="w-full sm:w-auto" icon={busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Rocket className="h-5 w-5" aria-hidden="true" />}>
            Launch solo run
          </Button>
          {error && <ErrorNotice error={error} onRetry={onLaunch} retrying={busy} className="mt-4" />}
        </motion.div>
      </motion.div>
    </div>
  );
}
