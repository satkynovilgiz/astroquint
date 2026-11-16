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
  it("label colours meet WCAG AA contrast on the space background", () => {
    for (const w of WORLDS) expect(contrast(w.palette.text, "#0B1020")).toBeGreaterThanOrEqual(4.5);
  });
  it("walks the route and ends after Final Bet", () => {
    expect(nextWorld("pattern-break")?.id).toBe("truth-trap");
    expect(nextWorld("final-bet")).toBeNull();
    expect(() => getWorld("nope" as never)).toThrow();
  });
});
