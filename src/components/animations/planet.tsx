import { useId, type CSSProperties } from "react";
import type { WorldDefinition, WorldPalette } from "@/features/worlds/worlds";
import { cn } from "@/lib/utils/cn";

type Surface = WorldDefinition["surface"];

export interface PlanetProps {
  palette: WorldPalette;
  surface: Surface;
  /** Rendered width/height. Any CSS length. */
  size?: string;
  /** Saturn-style ring, drawn behind and in front of the body. */
  ring?: boolean;
  /** Seconds per surface revolution. 0 disables rotation. */
  spinSeconds?: number;
  /** Atmospheric glow strength 0–1. */
  glow?: number;
  className?: string;
  label?: string;
}

/**
 * Pure-SVG planet: lit sphere + scrolling surface features + fixed terminator
 * shading, so the surface appears to rotate under a stable light source.
 * Server-renderable; motion is CSS-only and disabled by reduced-motion rules.
 */
export function Planet({
  palette,
  surface,
  size = "100%",
  ring = false,
  spinSeconds = 40,
  glow = 0.6,
  className,
  label,
}: PlanetProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `${name}-${uid}`;
  const style = { width: size, "--planet-spin": `${spinSeconds}s` } as CSSProperties;

  return (
    <div
      className={cn("relative aspect-square shrink-0", className)}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {glow > 0 && (
        <div
          className="absolute inset-[-18%] rounded-full"
          style={{
            background: `radial-gradient(circle, ${palette.glow} 0%, transparent 62%)`,
            opacity: glow * 0.55,
          }}
        />
      )}
      <svg viewBox="0 0 100 100" overflow="visible" className="planet-art relative h-full w-full">
        <defs>
          <radialGradient id={id("body")} cx="34%" cy="30%" r="78%">
            <stop offset="0%" stopColor={palette.highlight} />
            <stop offset="42%" stopColor={palette.primary} />
            <stop offset="100%" stopColor={palette.shadow} />
          </radialGradient>
          <radialGradient id={id("shade")} cx="30%" cy="28%" r="85%">
            <stop offset="45%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#05060f" stopOpacity="0.72" />
          </radialGradient>
          <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="40%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id("ring")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={palette.highlight} stopOpacity="0.1" />
            <stop offset="50%" stopColor={palette.highlight} stopOpacity="0.85" />
            <stop offset="100%" stopColor={palette.highlight} stopOpacity="0.1" />
          </linearGradient>
          <clipPath id={id("clip")}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>

        {ring && (
          <g transform="rotate(-16 50 50)">
            <path
              d="M -22 50 A 72 15 0 0 1 122 50"
              fill="none"
              stroke={`url(#${id("ring")})`}
              strokeWidth="3.2"
              opacity="0.55"
            />
          </g>
        )}

        <circle cx="50" cy="50" r="46" fill={`url(#${id("body")})`} />

        <g clipPath={`url(#${id("clip")})`}>
          <g className={spinSeconds > 0 ? "planet-surface" : undefined}>
            <SurfaceFeatures surface={surface} palette={palette} />
            <g transform="translate(100 0)">
              <SurfaceFeatures surface={surface} palette={palette} />
            </g>
          </g>
        </g>

        <circle cx="50" cy="50" r="46" fill={`url(#${id("shade")})`} />
        <circle cx="50" cy="50" r="45.4" fill="none" stroke={`url(#${id("rim")})`} strokeWidth="1.2" />

        {ring && (
          <g transform="rotate(-16 50 50)">
            <path
              d="M 122 50 A 72 15 0 0 1 -22 50"
              fill="none"
              stroke={`url(#${id("ring")})`}
              strokeWidth="3.2"
            />
            <path
              d="M 112 50 A 62 11 0 0 1 -12 50"
              fill="none"
              stroke={palette.highlight}
              strokeOpacity="0.35"
              strokeWidth="1"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

/** Surface details spanning x∈[0,100]; drawn twice side-by-side for a seamless loop. */
function SurfaceFeatures({ surface, palette }: { surface: Surface; palette: WorldPalette }) {
  const light = palette.highlight;
  const dark = palette.shadow;
  switch (surface) {
    case "rings":
      return (
        <g>
          <rect x="0" y="22" width="100" height="5" fill={light} opacity="0.22" />
          <rect x="0" y="34" width="100" height="9" fill={dark} opacity="0.28" />
          <rect x="0" y="52" width="100" height="4" fill={light} opacity="0.3" />
          <rect x="0" y="63" width="100" height="10" fill={dark} opacity="0.24" />
          <rect x="0" y="80" width="100" height="4" fill={light} opacity="0.18" />
          <ellipse cx="68" cy="58" rx="9" ry="4" fill={dark} opacity="0.4" />
          <ellipse cx="22" cy="40" rx="6" ry="2.5" fill={light} opacity="0.35" />
        </g>
      );
    case "bubbles":
      return (
        <g fill={dark}>
          <circle cx="18" cy="30" r="7" opacity="0.3" />
          <circle cx="44" cy="62" r="10" opacity="0.25" />
          <circle cx="76" cy="38" r="5" opacity="0.32" />
          <circle cx="86" cy="72" r="7" opacity="0.22" />
          <circle cx="30" cy="80" r="4" opacity="0.3" />
          <circle cx="60" cy="18" r="4" fill={light} opacity="0.4" />
          <circle cx="8" cy="58" r="3" fill={light} opacity="0.35" />
        </g>
      );
    case "dunes":
      return (
        <g fill="none" strokeLinecap="round">
          <path d="M0 30 Q 12 24 25 30 T 50 30 T 75 30 T 100 30" stroke={light} strokeWidth="2" opacity="0.35" />
          <path d="M0 46 Q 12 38 25 46 T 50 46 T 75 46 T 100 46" stroke={dark} strokeWidth="5" opacity="0.3" />
          <path d="M0 62 Q 12 56 25 62 T 50 62 T 75 62 T 100 62" stroke={light} strokeWidth="2" opacity="0.28" />
          <path d="M0 76 Q 12 70 25 76 T 50 76 T 75 76 T 100 76" stroke={dark} strokeWidth="4" opacity="0.28" />
        </g>
      );
    case "continents":
      return (
        <g fill={light} opacity="0.55">
          <path d="M10 28 q 10 -8 20 -2 q 6 6 -2 12 q -4 8 -12 6 q -10 -4 -6 -16z" />
          <path d="M46 50 q 12 -6 18 4 q 4 10 -6 16 q -6 10 -12 2 q -6 -10 0 -22z" />
          <path d="M78 24 q 8 -2 12 6 q 0 8 -8 8 q -8 -4 -4 -14z" />
          <path d="M20 66 q 6 -2 8 4 q -2 6 -8 4 q -4 -4 0 -8z" />
          <path d="M84 70 q 8 0 10 6 q -4 6 -10 4 q -4 -6 0 -10z" />
        </g>
      );
    case "crown":
      return (
        <g>
          <rect x="0" y="30" width="100" height="6" fill={dark} opacity="0.28" />
          <rect x="0" y="48" width="100" height="3" fill={light} opacity="0.45" />
          <rect x="0" y="62" width="100" height="8" fill={dark} opacity="0.24" />
          <g fill="#fff">
            <circle cx="16" cy="42" r="1" opacity="0.8" />
            <circle cx="52" cy="24" r="0.8" opacity="0.7" />
            <circle cx="70" cy="56" r="1.1" opacity="0.8" />
            <circle cx="88" cy="40" r="0.8" opacity="0.6" />
            <circle cx="34" cy="74" r="0.9" opacity="0.7" />
          </g>
        </g>
      );
  }
}
