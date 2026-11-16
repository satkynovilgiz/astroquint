"use client";

import { useEffect, useRef } from "react";
import { useShouldReduceMotion } from "@/hooks/use-reduced-motion";
import { createStars, spawnStar, starBudget, warpEnvelope, type Star } from "./starfield-engine";
import { onWarp } from "./warp-bus";

/**
 * Persistent full-screen starfield, rendered on a single canvas.
 * Canvas is used (instead of DOM/SVG) because a few hundred twinkling,
 * parallaxing points are far cheaper to draw than to lay out.
 *
 * - Three implicit depth layers (star.z) with pointer + scroll parallax.
 * - Warp mode: stars stream outward as light streaks (used by launches and
 *   planet travel).
 * - Pauses when the tab is hidden; draws a single static frame when motion
 *   is reduced; star count scales with screen size and device capability.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useShouldReduceMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowPower = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let raf = 0;
    let last = performance.now();
    let running = false;

    // Parallax state (target follows pointer; current eases toward it).
    let targetPX = 0;
    let targetPY = 0;
    let px = 0;
    let py = 0;

    // Warp state
    let warpStart = 0;
    let warpDuration = 0;
    let warpPeak = 1;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = createStars(starBudget(width, height, lowPower), width, height);
      if (!running) draw(performance.now(), 0);
    };

    const draw = (now: number, dt: number) => {
      const warp = warpDuration ? warpEnvelope(now - warpStart, warpDuration) * warpPeak : 0;
      if (warpDuration && now - warpStart >= warpDuration) warpDuration = 0;

      px += (targetPX - px) * Math.min(1, dt * 0.004);
      py += (targetPY - py) * Math.min(1, dt * 0.004);
      const scroll = window.scrollY;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      for (const s of stars) {
        if (!reduce && dt > 0) {
          // Ambient drift: slow, depth-scaled, toward upper-left.
          s.x -= dt * 0.004 * s.z;
          s.y -= dt * 0.0015 * s.z;
          if (warp > 0) {
            // Radial acceleration away from the centre.
            const speed = 1 + warp * dt * 0.012 * (0.4 + s.z * 1.6);
            s.x *= speed;
            s.y *= speed;
          }
          const halfW = width / 2 + 40;
          const halfH = height / 2 + 40;
          if (Math.abs(s.x) > halfW || Math.abs(s.y) > halfH) {
            if (warp > 0.05) {
              Object.assign(s, spawnStar(width, height, Math.random, true));
            } else {
              // Wrap ambient drift around the edges.
              if (s.x < -halfW) s.x += halfW * 2;
              if (s.x > halfW) s.x -= halfW * 2;
              if (s.y < -halfH) s.y += halfH * 2;
              if (s.y > halfH) s.y -= halfH * 2;
            }
          }
        }

        const parallax = s.z * s.z;
        const sx = cx + s.x + px * parallax * 26;
        const sy = cy + s.y + py * parallax * 18 - ((scroll * s.z * 0.12) % (height + 80));
        const y = sy < -40 ? sy + height + 80 : sy;
        const twinkle = reduce ? 0.85 : 0.6 + 0.4 * Math.sin(now * 0.0016 * (0.4 + s.z) + s.phase);
        const alpha = (0.25 + s.z * 0.75) * twinkle;

        if (warp > 0.02) {
          // Light streak pointing away from centre.
          const len = warp * (6 + s.z * 46);
          const mag = Math.hypot(s.x, s.y) || 1;
          ctx.strokeStyle = `rgba(${s.tint},${Math.min(1, alpha + warp * 0.3)})`;
          ctx.lineWidth = s.r * (0.8 + warp * 0.6);
          ctx.beginPath();
          ctx.moveTo(sx, y);
          ctx.lineTo(sx - (s.x / mag) * len, y - (s.y / mag) * len);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${s.tint},${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      draw(now, dt);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduce || document.visibilityState === "hidden") return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onVisibility = () => (document.visibilityState === "hidden" ? stop() : start());
    const onPointer = (e: PointerEvent) => {
      targetPX = (e.clientX / width) * 2 - 1;
      targetPY = (e.clientY / height) * 2 - 1;
    };
    const onScroll = () => {
      if (!running) draw(performance.now(), 0);
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    if (finePointer && !reduce) window.addEventListener("pointermove", onPointer, { passive: true });
    const offWarp = onWarp(({ durationMs, intensity = 1 }) => {
      if (reduce) return;
      warpStart = performance.now();
      warpDuration = durationMs;
      warpPeak = intensity;
    });

    return () => {
      stop();
      offWarp();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
