import type { CSSProperties } from "react";
import { Planet } from "@/components/animations/planet";
import { Ship } from "@/components/animations/ship";
import { getWorld } from "@/features/worlds/worlds";
import { CORE_PALETTE } from "@/components/brand/palette";

/** A ship riding a circular orbit around the centre of its container. */
function Orbiter({ radius, seconds, delay = 0, color, reverse = false, size = 18 }: { radius: string; seconds: number; delay?: number; color: string; reverse?: boolean; size?: number }) {
  return (
    <div
      className="absolute inset-0 animate-orbit"
      style={{ animationDuration: `${seconds}s`, animationDelay: `${delay}s`, animationDirection: reverse ? "reverse" : "normal" } as CSSProperties}
    >
      <div className="absolute left-1/2" style={{ top: `calc(50% - ${radius})`, transform: "translate(-50%, -50%)" }}>
        <div style={{ transform: `rotate(${reverse ? -90 : 90}deg)`, width: size }}>
          <Ship color={color} />
        </div>
      </div>
    </div>
  );
}

function Ring({ inset, dashed = false, color = "var(--aq-line-strong)" }: { inset: string; dashed?: boolean; color?: string }) {
  return <div className="absolute rounded-full border" style={{ inset, borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />;
}

export function SoloArt() {
  const w = getWorld("pattern-break");
  return (
    <div className="relative aspect-square w-full" aria-hidden="true">
      <Ring inset="8%" dashed />
      <div className="absolute inset-[26%]">
        <Planet palette={w.palette} surface="rings" spinSeconds={26} glow={0.8} />
      </div>
      <Orbiter radius="42%" seconds={9} color="#B9F46D" />
    </div>
  );
}

export function DailyArt() {
  const w = getWorld("final-bet");
  return (
    <div className="relative aspect-square w-full" aria-hidden="true">
      <div className="absolute inset-[6%] animate-orbit" style={{ animationDuration: "80s" }}>
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 15}deg)` }}>
            <span
              className="absolute left-1/2 top-0 w-[2px] -translate-x-1/2 rounded-full"
              style={{
                height: i % 6 === 0 ? "9%" : "5%",
                background: i % 6 === 0 ? "#F5C451" : "var(--aq-line-strong)",
              }}
            />
          </div>
        ))}
      </div>
      <Ring inset="16%" color="rgb(245 196 81 / 0.25)" />
      <div className="absolute inset-[28%]">
        <Planet palette={w.palette} surface="crown" spinSeconds={34} glow={1} />
      </div>
    </div>
  );
}

export function PartyArt() {
  return (
    <div className="relative aspect-square w-full" aria-hidden="true">
      <Ring inset="6%" dashed />
      <Ring inset="18%" />
      <div className="absolute inset-[30%]">
        <Planet palette={CORE_PALETTE} surface="rings" spinSeconds={30} glow={0.8} ring />
      </div>
      <Orbiter radius="44%" seconds={11} color="#B9F46D" />
      <Orbiter radius="44%" seconds={11} delay={-5.5} color="#FFB681" />
      <Orbiter radius="32%" seconds={8} color="#3DD6C4" reverse size={15} />
    </div>
  );
}
