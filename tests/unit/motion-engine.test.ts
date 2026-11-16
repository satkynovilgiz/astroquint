import { describe, expect, it } from "vitest";
import { starBudget, warpEnvelope, createStars } from "@/components/animations/starfield-engine";
import { orbitPoint, orbitArcPath } from "@/components/animations/orbit-math";

describe("starfield engine", () => {
  it("scales star count with screen area and caps it on low-power devices", () => {
    expect(starBudget(320, 568, false)).toBeGreaterThanOrEqual(50);
    expect(starBudget(2560, 1440, false)).toBe(240);
    expect(starBudget(2560, 1440, true)).toBe(110);
  });
  it("warp envelope starts and ends at rest and peaks at 1", () => {
    expect(warpEnvelope(0, 1000)).toBe(0);
    expect(warpEnvelope(1000, 1000)).toBe(0);
    expect(warpEnvelope(500, 1000)).toBe(1);
    expect(warpEnvelope(100, 1000)).toBeGreaterThan(0);
  });
  it("creates stars with depth in range", () => {
    for (const s of createStars(200, 800, 600)) {
      expect(s.z).toBeGreaterThanOrEqual(0.15);
      expect(s.z).toBeLessThanOrEqual(1);
    }
  });
});

describe("orbit maths", () => {
  const shape = { rx: 0.5, ry: 0.2, tilt: 0 };
  it("puts θ=π/2 nearest the viewer and θ=-π/2 farthest", () => {
    expect(orbitPoint(Math.PI / 2, shape).depth).toBeCloseTo(1);
    expect(orbitPoint(-Math.PI / 2, shape).depth).toBeCloseTo(-1);
    expect(orbitPoint(0, shape).x).toBeCloseTo(0.5);
  });
  it("builds SVG paths for both halves", () => {
    expect(orbitArcPath(shape, "near")).toMatch(/^M 100\.00 50\.00/);
    expect(orbitArcPath(shape, "far")).toMatch(/^M 0\.00 50\.00/);
  });
});
