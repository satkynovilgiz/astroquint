/**
 * Framework-free starfield simulation. Kept separate from React so the render
 * loop never triggers React work, and so the maths is unit-testable.
 */

export interface Star {
  /** Position relative to viewport centre, in CSS px. */
  x: number;
  y: number;
  /** Depth 0.15 (far) – 1 (near). Drives size, brightness, parallax and speed. */
  z: number;
  r: number;
  phase: number;
  tint: string;
}

const TINTS = ["248,250,255", "248,250,255", "248,250,255", "199,178,255", "217,255,168", "255,214,181"];

export function starBudget(width: number, height: number, lowPower: boolean): number {
  const byArea = Math.round((width * height) / 7000);
  const cap = lowPower ? 110 : 240;
  return Math.max(50, Math.min(cap, byArea));
}

export function createStars(count: number, width: number, height: number, rand = Math.random): Star[] {
  return Array.from({ length: count }, () => spawnStar(width, height, rand));
}

export function spawnStar(width: number, height: number, rand = Math.random, nearCentre = false): Star {
  const z = 0.15 + rand() ** 1.8 * 0.85;
  const spread = nearCentre ? 0.18 : 0.5;
  return {
    x: (rand() * 2 - 1) * width * spread,
    y: (rand() * 2 - 1) * height * spread,
    z,
    r: 0.35 + z * 1.25,
    phase: rand() * Math.PI * 2,
    tint: TINTS[Math.floor(rand() * TINTS.length)],
  };
}

/** Smooth 0→1→0 envelope for a warp of `durationMs`, evaluated at `elapsedMs`. */
export function warpEnvelope(elapsedMs: number, durationMs: number): number {
  if (elapsedMs <= 0 || elapsedMs >= durationMs) return 0;
  const t = elapsedMs / durationMs;
  const up = Math.min(1, t / 0.35);
  const down = Math.min(1, (1 - t) / 0.3);
  const ease = (v: number) => v * v * (3 - 2 * v);
  return ease(Math.min(up, down));
}
