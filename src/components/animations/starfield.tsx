"use client";

import { useEffect, useRef } from "react";
import { useShouldReduceMotion } from "@/hooks/use-reduced-motion";
import { usePreferences } from "@/features/preferences/use-preferences";
import { createMotes, createStars, meteorAlpha, spawnShootingStar, spawnStar, starBudget, warpEnvelope, type Mote, type ShootingStar, type Star } from "./starfield-engine";
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
  const [prefs] = usePreferences();
  const light = prefs.theme === "light";

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
    let motes: Mote[] = [];
    // Pre-rendered glow sprites (one per hue) — far cheaper than a gradient per mote per frame.
    const sprites = new Map<string, HTMLCanvasElement>();
    const spriteFor = (hue: string) => {
      let c = sprites.get(hue);
      if (!c) {
        c = document.createElement("canvas");
        c.width = c.height = 64;
        const sctx = c.getContext("2d");
        if (sctx) {
          const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
          g.addColorStop(0, `rgba(${hue},1)`);
          g.addColorStop(1, `rgba(${hue},0)`);
          sctx.fillStyle = g;
          sctx.fillRect(0, 0, 64, 64);
        }
        sprites.set(hue, c);
      }
      return c;
    };
    let meteors: ShootingStar[] = [];
    // Occasional shooting stars: rarer in light mode, never under reduced motion.
    const nextGap = () => (light ? 9000 : 4500) + Math.random() * (light ? 9000 : 7000);
    let nextMeteorAt = performance.now() + 2500 + Math.random() * 3000;
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
      motes = createMotes(lowPower ? 5 : width < 640 ? 7 : 12, width, height);
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
        const alpha = (0.25 + s.z * 0.75) * twinkle * (light ? 0.45 : 1);
        // Black theme: white/tinted stars. Light theme: soft violet-grey specks.
        const tint = light ? "86,74,160" : s.tint;

        if (warp > 0.02) {
          // Light streak pointing away from centre.
          const len = warp * (6 + s.z * 46);
          const mag = Math.hypot(s.x, s.y) || 1;
          ctx.strokeStyle = `rgba(${tint},${Math.min(1, alpha + warp * 0.3)})`;
          ctx.lineWidth = s.r * (0.8 + warp * 0.6);
          ctx.beginPath();
          ctx.moveTo(sx, y);
          ctx.lineTo(sx - (s.x / mag) * len, y - (s.y / mag) * len);
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${tint},${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Cosmic dust: soft glows drifting upward at a different depth.
      for (const m of motes) {
        if (!reduce && dt > 0) {
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.y < -20) m.y = height + 20;
          if (m.x < -20) m.x = width + 20;
          if (m.x > width + 20) m.x = -20;
        }
        const mx = m.x + px * 40;
        const my = m.y + py * 28;
        const pulse = 0.55 + 0.45 * Math.sin(now * 0.0009 + m.phase);
        const a = (light ? 0.22 : 0.32) * pulse * (1 - warp);
        const size = m.r * 12;
        ctx.globalAlpha = a;
        ctx.drawImage(spriteFor(m.hue), mx - size / 2, my - size / 2, size, size);
        ctx.globalAlpha = 1;
      }

      // Shooting stars.
      if (!reduce && dt > 0 && warp === 0 && now >= nextMeteorAt) {
        meteors.push(spawnShootingStar(width, height, now));
        nextMeteorAt = now + nextGap();
      }
      meteors = meteors.filter((m) => now - m.born < m.life);
      for (const m of meteors) {
        const age = now - m.born;
        const hx = m.x + m.vx * age;
        const hy = m.y + m.vy * age;
        const mag = Math.hypot(m.vx, m.vy);
        const tx = hx - (m.vx / mag) * m.length;
        const ty = hy - (m.vy / mag) * m.length;
        const a = meteorAlpha(age, m.life) * (light ? 0.5 : 0.95);
        const head = light ? "98,54,212" : "248,250,255";
        const grad = ctx.createLinearGradient(hx, hy, tx, ty);
        grad.addColorStop(0, `rgba(${head},${a})`);
        grad.addColorStop(0.3, `rgba(${light ? head : "191,168,255"},${a * 0.5})`);
        grad.addColorStop(1, `rgba(${head},0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
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
  }, [reduce, light]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
