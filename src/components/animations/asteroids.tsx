import type { CSSProperties } from "react";

interface Rock {
  top: string;
  left: string;
  size: number;
  dur: number;
  delay: number;
  dx: number;
  dy: number;
  rot: number;
  shape: number;
  hideOnMobile?: boolean;
}

const SHAPES = [
  "M8 1 L15 4 L17 11 L12 17 L4 16 L1 9 Z",
  "M6 2 L13 1 L17 7 L15 14 L8 17 L2 12 L1 6 Z",
  "M9 1 L16 6 L14 15 L6 17 L1 10 L3 4 Z",
];

const ROCKS: Rock[] = [
  { top: "12%", left: "6%", size: 14, dur: 16, delay: 0, dx: 12, dy: -10, rot: 40, shape: 0 },
  { top: "68%", left: "3%", size: 9, dur: 21, delay: -6, dx: 8, dy: 12, rot: -60, shape: 1, hideOnMobile: true },
  { top: "18%", left: "88%", size: 18, dur: 19, delay: -3, dx: -14, dy: 10, rot: 50, shape: 2 },
  { top: "82%", left: "78%", size: 11, dur: 23, delay: -9, dx: -10, dy: -12, rot: -30, shape: 0 },
  { top: "44%", left: "95%", size: 7, dur: 14, delay: -2, dx: -6, dy: 8, rot: 90, shape: 1, hideOnMobile: true },
  { top: "90%", left: "40%", size: 6, dur: 17, delay: -5, dx: 10, dy: -6, rot: 70, shape: 2, hideOnMobile: true },
];

/** A handful of slow-drifting asteroids. CSS-only; frozen under reduced motion. */
export function Asteroids({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className ?? ""}`} aria-hidden="true">
      {ROCKS.map((r, i) => (
        <svg
          key={i}
          viewBox="0 0 18 18"
          width={r.size}
          height={r.size}
          className={`absolute animate-drift ${r.hideOnMobile ? "hidden sm:block" : ""}`}
          style={
            {
              top: r.top,
              left: r.left,
              animationDuration: `${r.dur}s`,
              animationDelay: `${r.delay}s`,
              "--drift-x": `${r.dx}px`,
              "--drift-y": `${r.dy}px`,
              "--drift-r": `${r.rot}deg`,
            } as CSSProperties
          }
        >
          <path d={SHAPES[r.shape]} fill="#3A4366" stroke="#5B6690" strokeWidth="0.8" />
          <circle cx="7" cy="8" r="1.6" fill="#2A3150" />
        </svg>
      ))}
    </div>
  );
}
