"use client";

import { Reorder, motion, useDragControls } from "motion/react";
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, Lock, X } from "lucide-react";
import { playSound } from "@/features/audio/synth";
import { spring } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Burst } from "@/components/game/burst";
import type { WorldProps } from "./types";

type Item = { id: string; label: string };

export function Timeline({ question, world, locked, submitted, reveal, onSubmit }: WorldProps<"timeline">) {
  const [order, setOrder] = useState<Item[]>(question.events);
  const [announce, setAnnounce] = useState("");

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (locked || to < 0 || to >= order.length) return;
    const next = order.slice();
    [next[index], next[to]] = [next[to], next[index]];
    setOrder(next);
    playSound("tap");
    setAnnounce(`${next[to].label} moved to position ${to + 1} of ${next.length}`);
  };

  if (reveal?.timeline) {
    const yours = submitted?.kind === "order" ? submitted.ids : null;
    const perfect = !!yours && reveal.timeline.every((e, i) => yours[i] === e.id);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">The real order</h2>
          {perfect && (
            <motion.span
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring.press, delay: 0.5 }}
              className="relative rounded-pill bg-action px-3 py-1 text-sm font-bold text-action-fg"
            >
              Perfect order!
              <Burst />
            </motion.span>
          )}
        </div>
        <ol className="relative space-y-2.5 pl-5">
          {/* Chronological spine drawing itself downward */}
          <motion.span
            aria-hidden="true"
            className="absolute bottom-3 left-1.5 top-3 w-0.5 origin-top rounded-full"
            style={{ background: `linear-gradient(${world.palette.glow}, color-mix(in srgb, ${world.palette.glow} 20%, transparent))` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
          {reveal.timeline.map((e, i) => {
            const right = yours ? yours[i] === e.id : false;
            return (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...spring.settle, delay: i * 0.08 }}
                className={cn("panel relative flex items-center gap-3 rounded-2xl p-3 sm:p-4", right ? "border-action/50" : "border-danger/40")}
              >
                <motion.span
                  aria-hidden="true"
                  className="absolute -left-[1.3rem] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-bg"
                  style={{ background: world.palette.glow }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...spring.press, delay: 0.2 + i * 0.12 }}
                />
                <span className="tabular w-[5.5rem] shrink-0 font-display text-sm font-bold sm:w-28 sm:text-base" style={{ color: world.ink }}>
                  {e.dateLabel}
                </span>
                <span className="flex-1 text-[0.98rem] leading-snug">{e.label}</span>
                {yours && (
                  <span
                    className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", right ? "bg-action text-action-fg" : "bg-danger/80 text-space")}
                    aria-label={right ? "You placed this correctly" : `You placed this at position ${yours.indexOf(e.id) + 1}`}
                  >
                    {right ? <Check className="h-4 w-4" strokeWidth={3} /> : <X className="h-4 w-4" strokeWidth={3} />}
                  </span>
                )}
              </motion.li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold sm:text-2xl">{question.prompt}</h2>
        <p className="mt-1 text-sm text-fg-muted">Drag the handles, or use the arrows. Earliest goes at the top.</p>
      </div>
      <div className="flex items-stretch gap-3">
        <div className="flex w-5 flex-col items-center justify-between py-2 text-fg-muted" aria-hidden="true">
          <span className="hud-label [writing-mode:vertical-rl] rotate-180">Earliest</span>
          <span className="my-2 w-px flex-1" style={{ background: `linear-gradient(${world.palette.glow}, transparent)` }} />
          <span className="hud-label [writing-mode:vertical-rl] rotate-180">Latest</span>
        </div>
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={(next) => !locked && setOrder(next)}
          className="flex-1 space-y-2.5"
          aria-label="Events, earliest first"
        >
          {order.map((item, i) => (
            <TimelineItem key={item.id} item={item} index={i} total={order.length} locked={locked} accent={world.palette.glow} onMove={move} />
          ))}
        </Reorder.Group>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <Button
        size="lg"
        className="w-full sm:w-auto"
        disabled={locked}
        onClick={() => {
          playSound("lock");
          onSubmit({ kind: "order", ids: order.map((o) => o.id) });
        }}
        icon={<Lock className="h-4 w-4" aria-hidden="true" />}
      >
        Lock in order
      </Button>
    </div>
  );
}

function TimelineItem({
  item,
  index,
  total,
  locked,
  accent,
  onMove,
}: {
  item: Item;
  index: number;
  total: number;
  locked: boolean;
  accent: string;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.03, boxShadow: `0 18px 40px -12px ${accent}`, zIndex: 5 }}
      transition={spring.settle}
      className="panel relative flex items-center gap-2 rounded-2xl py-2 pl-1 pr-2 sm:gap-3"
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.altKey && e.key === "ArrowUp") onMove(index, -1);
        if (e.altKey && e.key === "ArrowDown") onMove(index, 1);
      }}
    >
      <button
        type="button"
        aria-label={`Drag to reorder: ${item.label}`}
        disabled={locked}
        onPointerDown={(e) => !locked && controls.start(e)}
        className="grid h-11 w-9 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-fg-muted hover:text-fg active:cursor-grabbing disabled:cursor-default"
      >
        <GripVertical className="h-5 w-5" aria-hidden="true" />
      </button>
      <span className="tabular grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-fg/8 font-display text-sm font-bold" aria-hidden="true">
        {index + 1}
      </span>
      <span className="flex-1 py-1 text-[0.98rem] leading-snug">{item.label}</span>
      <span className="flex shrink-0 flex-col gap-1 sm:flex-row">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={locked || index === 0}
          aria-label={`Move “${item.label}” earlier`}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30 sm:h-11 sm:w-11"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={locked || index === total - 1}
          aria-label={`Move “${item.label}” later`}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-30 sm:h-11 sm:w-11"
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>
    </Reorder.Item>
  );
}
