"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { getWorld, nextWorld } from "@/features/worlds/worlds";
import type { GameActions, GameView } from "@/features/gameplay/controller";
import type { Answer } from "@/features/questions/types";
import { playSound } from "@/features/audio/synth";
import { duration, ease } from "@/lib/motion/tokens";
import { PatternBreak } from "@/components/worlds/pattern-break";
import { TruthTrap } from "@/components/worlds/truth-trap";
import { Timeline } from "@/components/worlds/timeline";
import { GeoTap } from "@/components/worlds/geotap";
import { FinalBetQuestion, WagerPicker, FINAL_SUSPENSE_MS } from "@/components/worlds/final-bet";
import { RouteProgress } from "./route-progress";
import { ScoreCounter } from "./score-counter";
import { Timer } from "./timer";
import { WorldIntro } from "./world-intro";
import { Travel } from "./travel";
import { RevealPanel } from "./reveal-panel";
import { Results } from "./results";

const scene = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.arrive } },
  exit: { opacity: 0, y: -12, transition: { duration: duration.fast, ease: ease.depart } },
};

export interface GameScreenProps {
  view: GameView;
  actions: GameActions;
  resultsTitle: string;
  resultsSubtitle?: string;
  shareUrl?: string;
  onPlayAgain?: () => void;
  playAgainLabel?: string;
  resultsExtra?: ReactNode;
  /** Extra HUD content (e.g. a ranked badge). */
  badge?: ReactNode;
}

export function GameScreen({ view, actions, resultsTitle, resultsSubtitle, shareUrl, onPlayAgain, playAgainLabel, resultsExtra, badge }: GameScreenProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const world = getWorld(view.worldId);
  const upcoming = nextWorld(view.worldId);
  const round = view.rounds[view.roundIndex];

  // Authoritative clock lives in the controller; we just poke it at the deadline.
  useEffect(() => {
    if (view.phase !== "playing" || view.deadline === null) return;
    const t = setTimeout(() => actions.expire(), Math.max(0, view.deadline - Date.now()) + 30);
    return () => clearTimeout(t);
  }, [view.phase, view.deadline, actions]);

  // Answer feedback sound (Final Bet plays its own after the suspense beat).
  useEffect(() => {
    if (view.phase !== "revealed" || view.worldId === "final-bet") return;
    playSound(round?.outcome === "correct" ? "correct" : "incorrect");
  }, [view.phase, view.roundIndex, view.worldId, round?.outcome]);

  // New scene (intro, travel, wager, results): bring the player back to the top of the stage.
  const sceneGroup = view.phase === "revealed" ? "playing" : view.phase;
  useEffect(() => {
    if (sceneGroup === "playing") return;
    const top = stageRef.current ? stageRef.current.getBoundingClientRect().top + window.scrollY - 80 : 0;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: "instant" as ScrollBehavior });
  }, [sceneGroup, view.roundIndex]);

  const locked = view.phase !== "playing" || view.busy;
  const submit = (a: Answer) => {
    if (!locked) actions.submit(a);
  };

  // Playing and revealed share one scene so the question stays mounted while its answer is revealed.
  const sceneKey = view.phase === "revealed" || view.phase === "playing" ? `play-${view.roundIndex}` : `${view.phase}-${view.roundIndex}`;

  return (
    <div ref={stageRef} className="min-h-[70dvh] pb-10">
      <div
        aria-hidden="true"
        className="world-atmosphere"
        style={{ "--world-glow": view.phase === "complete" ? "#9167F4" : world.palette.glow } as CSSProperties}
      />
      <div className="mx-auto max-w-3xl">
        {view.phase !== "complete" && (
          <div className="flex items-center justify-between gap-3 py-3">
            <RouteProgress rounds={view.rounds} current={view.roundIndex} />
            <div className="flex items-center gap-3">
              {badge}
              <ScoreCounter value={view.score} />
            </div>
          </div>
        )}

        {view.error && (
          <p role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
            {view.error}
          </p>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={sceneKey} {...scene}>
            {view.phase === "intro" && <WorldIntro world={world} relaxed={view.relaxed} onBegin={actions.begin} />}

            {view.phase === "wager" && <WagerPicker score={view.score} onLock={actions.lockWager} busy={view.busy} />}

            {(view.phase === "playing" || view.phase === "revealed") && view.question && (
              <div>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-2 rounded-pill border border-line px-3 py-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: world.palette.glow }} aria-hidden="true" />
                    <span className="hud-label" style={{ color: world.ink }}>
                      {world.code} · {world.name}
                    </span>
                  </p>
                  <Timer
                    deadline={view.deadline}
                    limitMs={world.timeLimitMs}
                    frozen={view.phase !== "playing"}
                    color={world.palette.glow}
                  />
                </div>
                <WorldBody view={view} onSubmit={submit} locked={locked} />
                {view.phase === "revealed" && view.reveal && round && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: view.worldId === "final-bet" ? FINAL_SUSPENSE_MS / 1000 : 0.15 }}
                  >
                    <RevealPanel
                      reveal={view.reveal}
                      round={round}
                      isLast={!upcoming}
                      nextLabel={upcoming ? `Travel to ${upcoming.name}` : "See results"}
                      onNext={actions.next}
                    />
                  </motion.div>
                )}
              </div>
            )}

            {view.phase === "travel" && upcoming && <Travel from={world} to={upcoming} onDone={actions.arrive} />}

            {view.phase === "complete" && view.summary && (
              <div className="pt-4">
                <Results view={view} title={resultsTitle} subtitle={resultsSubtitle} shareUrl={shareUrl} onPlayAgain={onPlayAgain} playAgainLabel={playAgainLabel} extra={resultsExtra} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function WorldBody({ view, onSubmit, locked }: { view: GameView; onSubmit: (a: Answer) => void; locked: boolean }) {
  const q = view.question!;
  const world = getWorld(q.world);
  const common = { world, locked, submitted: view.submitted, reveal: view.reveal, onSubmit };
  switch (q.world) {
    case "pattern-break":
      return <PatternBreak key={q.id} question={q} {...common} />;
    case "truth-trap":
      return <TruthTrap key={q.id} question={q} {...common} />;
    case "timeline":
      return <Timeline key={q.id} question={q} {...common} />;
    case "geotap":
      return <GeoTap key={q.id} question={q} {...common} />;
    case "final-bet":
      return <FinalBetQuestion key={q.id} question={q} {...common} wager={view.wager ?? 0} />;
  }
}
