"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Download, Lock, RotateCcw, Share2, X, LayoutGrid } from "lucide-react";
import { renderShareCard, shareOrDownloadCard } from "@/features/share/share-card";
import { CountUp } from "./count-up";
import { Celebration } from "./celebration";
import { WORLDS } from "@/features/worlds/worlds";
import { ACHIEVEMENTS } from "@/features/achievements/achievements";
import { shareText, type GameSummary } from "@/features/gameplay/summary";
import type { GameView } from "@/features/gameplay/controller";
import { playSound } from "@/features/audio/synth";
import { Planet } from "@/components/animations/planet";
import { Button, ButtonLink } from "@/components/ui/button";
import { riseIn, spring, staggerChildren } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

export function Results({
  view,
  title,
  subtitle,
  shareUrl,
  onPlayAgain,
  playAgainLabel = "Play again",
  extra,
}: {
  view: GameView;
  title: string;
  subtitle?: string;
  shareUrl?: string;
  onPlayAgain?: () => void;
  playAgainLabel?: string;
  extra?: React.ReactNode;
}) {
  const summary = view.summary as GameSummary;
  const [shareState, setShareState] = useState<"idle" | "copied" | "error">("idle");
  const [openReview, setOpenReview] = useState<number | null>(null);
  const [imageState, setImageState] = useState<"idle" | "working" | "done" | "error">("idle");

  const saveImage = async () => {
    setImageState("working");
    try {
      const blob = await renderShareCard(summary, title, subtitle);
      await shareOrDownloadCard(blob, "astroquint-result.png");
      setImageState("done");
    } catch (err) {
      setImageState((err as DOMException)?.name === "AbortError" ? "idle" : "error");
    }
    setTimeout(() => setImageState("idle"), 2500);
  };

  useEffect(() => {
    const t = setTimeout(() => playSound(summary.correct >= 3 ? "reward" : "select"), 400);
    return () => clearTimeout(t);
  }, [summary.correct]);

  const share = async () => {
    const text = shareText(summary, title, shareUrl);
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareState("copied");
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      setShareState("error");
    }
    setTimeout(() => setShareState("idle"), 2500);
  };

  const headline =
    summary.correct === 5 ? "Perfect orbit!" : summary.correct >= 3 ? "Orbit complete" : summary.correct >= 1 ? "You made it back" : "Rough flight";

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-line bg-gradient-to-b from-surface-2/80 to-surface/60 px-5 py-8 text-center sm:py-10">
        {summary.correct >= 3 && <Celebration />}
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hud-label text-brand-soft">
          {title}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.settle, delay: 0.1 }}
          className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl"
        >
          {headline}
        </motion.h2>
        <p className="tabular mt-4 font-display text-[clamp(3.5rem,16vw,6rem)] font-bold leading-none text-action" aria-label={`Final score ${summary.total}`}>
          <CountUp to={summary.total} />
        </p>
        <p className="mt-1 text-sm text-fg-muted">points</p>

        <motion.ol variants={staggerChildren(0.5, 0.12)} initial="hidden" animate="visible" className="mx-auto mt-7 flex max-w-md justify-center gap-3 sm:gap-5" aria-label="Results by world">
          {summary.perWorld.map((r) => {
            const w = WORLDS.find((x) => x.id === r.worldId)!;
            const ok = r.outcome === "correct";
            return (
              <motion.li key={r.worldId} variants={{ hidden: { opacity: 0, y: 16, scale: 0.6 }, visible: { opacity: 1, y: 0, scale: 1, transition: spring.press } }} className="flex flex-col items-center gap-1.5">
                <span className="relative w-11 sm:w-14">
                  <Planet palette={w.palette} surface={w.surface} spinSeconds={0} glow={ok ? 0.9 : 0.15} className={cn(!ok && "opacity-45 grayscale")} />
                  <span className={cn("absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-surface", ok ? "bg-action text-action-fg" : "bg-danger text-space")}>
                    {ok ? <Check className="h-3 w-3" strokeWidth={4} /> : <X className="h-3 w-3" strokeWidth={4} />}
                  </span>
                </span>
                <span className="tabular text-xs text-fg-muted">{r.points + (r.wagerDelta ?? 0) >= 0 ? "+" : "−"}{Math.abs(r.points + (r.wagerDelta ?? 0))}</span>
                <span className="sr-only">
                  {w.name}: {ok ? "correct" : r.outcome === "timeout" ? "time ran out" : "incorrect"}
                </span>
              </motion.li>
            );
          })}
        </motion.ol>
      </section>

      <motion.dl variants={staggerChildren(1.0, 0.07)} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Correct", v: `${summary.correct}/5` },
          { k: "Accuracy", v: `${summary.accuracy}%` },
          { k: "Fastest answer", v: summary.fastestMs === null ? "—" : `${(summary.fastestMs / 1000).toFixed(1)}s` },
          {
            k: "Final bet",
            v: summary.wager ? `${summary.wager.delta >= 0 ? "+" : "−"}${Math.abs(summary.wager.delta)}` : "—",
          },
        ].map((s) => (
          <motion.div key={s.k} variants={riseIn} className="panel rounded-2xl p-4">
            <dt className="hud-label text-fg-muted">{s.k}</dt>
            <dd className="tabular mt-1 font-display text-2xl font-bold">{s.v}</dd>
          </motion.div>
        ))}
      </motion.dl>

      <section aria-labelledby="ach-title">
        <h3 id="ach-title" className="font-display text-xl font-bold">
          Achievements <span className="text-fg-muted">· {summary.achievements.length} unlocked</span>
        </h3>
        <motion.ul variants={staggerChildren(1.3, 0.1)} initial="hidden" animate="visible" className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const got = summary.achievements.includes(a.id);
            return (
              <motion.li
                key={a.id}
                variants={{ hidden: { opacity: 0, y: 12, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: spring.settle } }}
                className={cn("panel relative flex items-center gap-3 overflow-hidden rounded-2xl p-3.5", got ? "border-reward/50" : "border-dashed")}
              >
                {got && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{ x: ["-100%", "120%"] }}
                    transition={{ duration: 1.1, delay: 1.6, ease: "easeInOut" }}
                  />
                )}
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl", got ? "bg-reward/20" : "bg-fg/5")} aria-hidden="true">
                  {got ? a.glyph : <Lock className="h-4 w-4 text-fg-muted" />}
                </span>
                <span>
                  <span className="block font-display font-semibold">{a.name}</span>
                  <span className="block text-sm leading-snug text-fg-muted">{a.rule}</span>
                </span>
                <span className="sr-only">{got ? "Unlocked" : "Locked"}</span>
              </motion.li>
            );
          })}
        </motion.ul>
      </section>

      {view.review && (
        <section aria-labelledby="review-title">
          <h3 id="review-title" className="font-display text-xl font-bold">
            Review your flight
          </h3>
          <ul className="mt-3 space-y-2">
            {view.review.map((r, i) => {
              const w = WORLDS.find((x) => x.id === r.worldId)!;
              const open = openReview === i || (openReview === null && r.outcome !== "correct" && i === view.review!.findIndex((x) => x.outcome !== "correct"));
              return (
                <li key={r.worldId} className="panel overflow-hidden rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setOpenReview(open ? -1 : i)}
                    aria-expanded={open}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", r.outcome === "correct" ? "bg-action text-action-fg" : "bg-danger text-space")} aria-hidden="true">
                      {r.outcome === "correct" ? <Check className="h-3.5 w-3.5" strokeWidth={4} /> : <X className="h-3.5 w-3.5" strokeWidth={4} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="hud-label block" style={{ color: w.ink }}>
                        {w.name}
                      </span>
                      <span className="block truncate text-[0.95rem]">{r.title}</span>
                    </span>
                    <ChevronDown className={cn("h-5 w-5 shrink-0 text-fg-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
                  </button>
                  {open && <p className="border-t border-line px-4 py-3 text-sm leading-relaxed text-fg-muted">{r.explanation}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {extra}

      <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
        {onPlayAgain && (
          <Button size="lg" onClick={onPlayAgain} autoFocus icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}>
            {playAgainLabel}
          </Button>
        )}
        <Button size="lg" variant="secondary" onClick={share} icon={<Share2 className="h-5 w-5" aria-hidden="true" />}>
          {shareState === "copied" ? "Copied to clipboard!" : shareState === "error" ? "Couldn't copy" : "Share result"}
        </Button>
        <Button size="lg" variant="secondary" onClick={saveImage} disabled={imageState === "working"} icon={<Download className="h-5 w-5" aria-hidden="true" />}>
          {imageState === "working" ? "Rendering…" : imageState === "done" ? "Image ready!" : imageState === "error" ? "Couldn't create image" : "Save image"}
        </Button>
        <ButtonLink href="/play" transitionTypes={["nav-back"]} size="lg" variant="ghost" icon={<LayoutGrid className="h-5 w-5" aria-hidden="true" />}>
          Other modes
        </ButtonLink>
      </div>
      <p className="sr-only" aria-live="polite">
        {shareState === "copied" ? "Result copied to clipboard" : ""}
      </p>
    </div>
  );
}
