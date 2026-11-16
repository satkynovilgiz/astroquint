import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WORLDS, WORLD_IDS, getWorld, nextWorld } from "@/features/worlds/worlds";

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("worlds", () => {
  it("defines exactly five worlds in order", () => {
    expect(WORLDS.map((w) => w.id)).toEqual([...WORLD_IDS]);
    expect(WORLDS.map((w) => w.order)).toEqual([1, 2, 3, 4, 5]);
  });
  it("uses the specified timers (GeoTap 25s, others 20s)", () => {
    for (const w of WORLDS) expect(w.timeLimitMs).toBe(w.id === "geotap" ? 25_000 : 20_000);
  });
  it("label colours meet WCAG AA contrast on black-theme backgrounds and cards", () => {
    for (const w of WORLDS) {
      for (const bg of ["#050505", "#111114", "#19191F"]) expect(contrast(w.palette.text, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("theme tokens in globals.css meet WCAG AA in both themes", () => {
    const css = readFileSync(resolve(__dirname, "../../src/app/globals.css"), "utf8");
    const scope = (sel: string) => css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
    const read = (block: string, name: string) => block.match(new RegExp(`--aq-${name}:\\s*(#[0-9a-f]{6})`, "i"))![1];
    for (const sel of [':root[data-theme="dark"]', ':root[data-theme="light"]']) {
      const b = scope(sel);
      for (const bgName of ["bg", "surface", "surface-2"]) {
        const bg = read(b, bgName);
        for (const ink of ["fg", "fg-muted", "action", "brand-soft", "reward", "danger", "w1", "w2", "w3", "w4", "w5"]) {
          expect(contrast(read(b, ink), bg), `${sel} ${ink} on ${bgName}`).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrast(read(b, "action-fg"), read(b, "action")), `${sel} button text`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("walks the route and ends after Final Bet", () => {
    expect(nextWorld("pattern-break")?.id).toBe("truth-trap");
    expect(nextWorld("final-bet")).toBeNull();
    expect(() => getWorld("nope" as never)).toThrow();
  });
});
