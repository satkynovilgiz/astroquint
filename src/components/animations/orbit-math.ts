export interface OrbitPoint {
  /** Offset from centre as a fraction of the container size. */
  x: number;
  y: number;
  /** -1 (far side) … 1 (near side). */
  depth: number;
}

export interface OrbitShape {
  /** Horizontal radius as fraction of container. */
  rx: number;
  /** Vertical squash (perspective tilt). */
  ry: number;
  /** Orbit plane rotation in radians. */
  tilt: number;
}

/** Position on a tilted elliptical orbit. θ = π/2 is the point nearest the viewer. */
export function orbitPoint(theta: number, { rx, ry, tilt }: OrbitShape): OrbitPoint {
  const ex = Math.cos(theta) * rx;
  const ey = Math.sin(theta) * ry;
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  return { x: ex * c - ey * s, y: ex * s + ey * c, depth: Math.sin(theta) };
}

/** SVG path (viewBox 0 0 100 100) for the near or far half of an orbit. */
export function orbitArcPath(shape: OrbitShape, half: "near" | "far", steps = 48): string {
  const from = half === "near" ? 0 : Math.PI;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = orbitPoint(from + (Math.PI * i) / steps, shape);
    pts.push(`${(50 + p.x * 100).toFixed(2)} ${(50 + p.y * 100).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")}`;
}
