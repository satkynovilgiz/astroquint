"use client";

import { useEffect, useId, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { WORLDS } from "@/features/worlds/worlds";
import { useShouldReduceMotion } from "@/hooks/use-reduced-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { duration, ease, spring } from "@/lib/motion/tokens";
import { CORE_PALETTE } from "@/components/brand/palette";
import { Planet } from "./planet";
import { orbitArcPath, orbitPoint, type OrbitShape } from "./orbit-math";

const ORBIT: OrbitShape = { rx: 0.46, ry: 0.15, tilt: -0.18 };
const INNER: OrbitShape = { rx: 0.37, ry: 0.11, tilt: -0.18 };
const PERIOD_MS = 48_000;
const NEAR_PATH = orbitArcPath(ORBIT, "near");
const FAR_PATH = orbitArcPath(ORBIT, "far");
const INNER_NEAR = orbitArcPath(INNER, "near");
const INNER_FAR = orbitArcPath(INNER, "far");

/**
 * The homepage centrepiece: the Astroquint home planet with the five worlds
 * travelling a tilted orbit. Worlds pass behind and in front of the core
 * (depth-sorted each frame), scale with distance and dim on the far side.
 * Positions are written straight to the DOM inside one rAF loop, so React
 * never re-renders while it animates.
 */
export function OrbitSystem({ className }: { className?: string }) {
  const reduce = useShouldReduceMotion();
  const finePointer = useMediaQuery("(pointer: fine)");
  const satellites = useRef<Array<HTMLDivElement | null>>([]);

  // Pointer-driven depth tilt (desktop only).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, spring.float);
  const sy = useSpring(my, spring.float);
  const rotateY = useTransform(sx, [-1, 1], [-9, 9]);
  const rotateX = useTransform(sy, [-1, 1], [7, -7]);
  const shiftX = useTransform(sx, [-1, 1], [-10, 10]);

  useEffect(() => {
    if (!finePointer || reduce) return;
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [finePointer, reduce, mx, my]);

  useEffect(() => {
    let raf = 0;
    let offset = 0;
    let last = performance.now();

    const place = () => {
      WORLDS.forEach((_, i) => {
        const el = satellites.current[i];
        if (!el) return;
        const theta = offset + (i / WORLDS.length) * Math.PI * 2 + Math.PI / 2;
        const p = orbitPoint(theta, ORBIT);
        const scale = 0.72 + ((p.depth + 1) / 2) * 0.42;
        el.style.transform = `translate3d(${(p.x * 100).toFixed(3)}cqw, ${(p.y * 100).toFixed(3)}cqw, 0) scale(${scale.toFixed(3)})`;
        el.style.zIndex = p.depth > 0 ? "30" : "5";
        el.style.opacity = (0.6 + ((p.depth + 1) / 2) * 0.4).toFixed(3);
      });
    };

    const tick = (now: number) => {
      offset += ((now - last) / PERIOD_MS) * Math.PI * 2;
      last = now;
      place();
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (reduce || document.visibilityState === "hidden") return;
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? cancelAnimationFrame(raf) : start());

    place();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce]);

  return (
    <div className={className} style={{ perspective: 900 }}>
      <motion.div
        className="relative aspect-square w-full [container-type:inline-size]"
        style={{ rotateX, rotateY, x: shiftX, transformStyle: "preserve-3d" }}
        role="img"
        aria-label="The Astroquint home planet with five worlds in orbit: Pattern Break, Truth Trap, Timeline, GeoTap and Final Bet."
      >
        {/* Far halves of the orbits, behind everything */}
        <OrbitTrails paths={[FAR_PATH, INNER_FAR]} opacity={0.35} className="z-0" />

        {/* Core planet */}
        <motion.div
          className="absolute inset-[25%] z-10"
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: duration.scene, ease: ease.arrive }}
        >
          <Planet palette={CORE_PALETTE} surface="rings" ring spinSeconds={60} glow={0.9} />
        </motion.div>

        {/* Near halves drawn above the core */}
        <OrbitTrails paths={[NEAR_PATH, INNER_NEAR]} opacity={0.7} className="z-20" />

        {/* The five worlds */}
        {WORLDS.map((world, i) => (
          <div
            key={world.id}
            ref={(el) => {
              satellites.current[i] = el;
            }}
            className="absolute left-1/2 top-1/2 -ml-[6.5%] -mt-[6.5%] w-[13%] will-change-transform"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: duration.slow, ease: ease.arrive, delay: 0.35 + i * 0.08 }}
            >
              <Planet palette={world.palette} surface={world.surface} spinSeconds={18 + i * 4} glow={0.7} />
            </motion.div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function OrbitTrails({ paths, opacity, className }: { paths: string[]; opacity: number; className?: string }) {
  const gid = `orbit-stroke-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 100 100" overflow="visible" className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#9167F4" stopOpacity="0" />
          <stop offset="50%" stopColor="#C7B2FF" stopOpacity="1" />
          <stop offset="100%" stopColor="#B9F46D" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={i === 0 ? 0.35 : 0.22}
          strokeDasharray={i === 0 ? undefined : "0.6 1.4"}
          opacity={opacity * (i === 0 ? 1 : 0.7)}
        />
      ))}
    </svg>
  );
}
