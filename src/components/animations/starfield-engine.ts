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

// ── Shooting stars & cosmic dust ─────────────────────────────────────────

export interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  length: number;
}

/** A meteor entering from the upper part of the screen, travelling diagonally. */
export function spawnShootingStar(width: number, height: number, now: number, rand = Math.random): ShootingStar {
  const leftward = rand() < 0.5;
  const angle = (leftward ? 200 : -20) * (Math.PI / 180) + (rand() - 0.5) * 0.35;
  const speed = 0.9 + rand() * 0.6; // px per ms
  return {
    x: leftward ? width * (0.45 + rand() * 0.55) : width * rand() * 0.55,
    y: height * rand() * 0.35,
    vx: Math.cos(angle) * speed * (leftward ? 1 : 1),
    vy: Math.abs(Math.sin(angle)) * speed + 0.25,
    born: now,
    life: 650 + rand() * 450,
    length: 110 + rand() * 110,
  };
}

/** 0→1→0 brightness over a meteor's life. */
export function meteorAlpha(age: number, life: number): number {
  if (age <= 0 || age >= life) return 0;
  const t = age / life;
  return t < 0.2 ? t / 0.2 : (1 - t) / 0.8;
}

export interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: string;
  phase: number;
}

const MOTE_HUES = ["145,103,244", "61,214,196", "185,244,109", "255,182,129"];

/** A few large, slow, softly glowing dust motes for depth. */
export function createMotes(count: number, width: number, height: number, rand = Math.random): Mote[] {
  return Array.from({ length: count }, () => ({
    x: rand() * width,
    y: rand() * height,
    r: 1.4 + rand() * 2.4,
    vx: (rand() - 0.5) * 0.012,
    vy: -0.004 - rand() * 0.01,
    hue: MOTE_HUES[Math.floor(rand() * MOTE_HUES.length)],
    phase: rand() * Math.PI * 2,
  }));
}
