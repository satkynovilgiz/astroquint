"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";
import { playSound } from "@/features/audio/synth";
import { Button } from "@/components/ui/button";
import type { WorldProps } from "./types";

// The map data (~125 KB) only loads when a player reaches GeoTap.
const WorldMap = dynamic(() => import("./world-map").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => (
    <div className="grid aspect-[1000/470] w-full place-items-center rounded-2xl border border-line bg-(--aq-map-ocean) text-fg-muted">
      <span className="inline-flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Charting the map…
      </span>
    </div>
  ),
});

export function GeoTap({ question, world, locked, submitted, reveal, onSubmit }: WorldProps<"geotap">) {
  const [selected, setSelected] = useState<string | null>(submitted?.kind === "country" ? submitted.id : null);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">{question.prompt}</h2>
        {!reveal && <p className="text-sm text-fg-muted">Tap a country, then lock it in.</p>}
      </div>
      <WorldMap
        selected={selected}
        onSelect={(id) => {
          if (locked) return;
          setSelected(id);
          playSound("tap");
        }}
        locked={locked}
        correctId={reveal?.country?.id ?? null}
        accent={world.palette.glow}
      />
      {reveal?.country ? (
        <p className="text-sm text-fg-muted">
          <span className="font-semibold text-action">{reveal.country.name}</span> is highlighted in green
          {!reveal.correct && selected ? "; your pick is shown in red." : "."}
        </p>
      ) : (
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={locked || !selected}
          onClick={() => {
            if (!selected) return;
            playSound("lock");
            onSubmit({ kind: "country", id: selected });
          }}
          icon={<Crosshair className="h-4 w-4" aria-hidden="true" />}
        >
          {selected ? "Lock in this country" : "Select a country"}
        </Button>
      )}
    </div>
  );
}
