"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import mapData from "@/features/geo/world-map.json";
import { cn } from "@/lib/utils/cn";

type Country = { id: string; name: string; d: string; c: number[]; b: number[] };
const COUNTRIES = mapData.countries as Country[];
const W = mapData.width;
const H = mapData.height;
const MAX_ZOOM = 8;

interface View {
  k: number;
  x: number;
  y: number;
}

function clampView(v: View): View {
  const k = Math.min(MAX_ZOOM, Math.max(1, v.k));
  // Keep the map covering the viewport.
  const x = Math.min(0, Math.max(W - W * k, v.x));
  const y = Math.min(0, Math.max(H - H * k, v.y));
  return { k, x, y };
}

function zoomAt(v: View, factor: number, px: number, py: number): View {
  const k = Math.min(MAX_ZOOM, Math.max(1, v.k * factor));
  const f = k / v.k;
  return clampView({ k, x: px - (px - v.x) * f, y: py - (py - v.y) * f });
}

function fitBox(b: number[]): View {
  const [x0, y0, x1, y1] = b;
  const bw = Math.max(x1 - x0, 20);
  const bh = Math.max(y1 - y0, 20);
  const k = Math.min(5, Math.max(1, 0.55 * Math.min(W / bw, H / bh)));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return clampView({ k, x: W / 2 - cx * k, y: H / 2 - cy * k });
}

/** Nearest country centroid in an arrow-key direction (accessible alternative to tapping). */
function neighbour(from: Country | undefined, dir: "up" | "down" | "left" | "right"): Country {
  if (!from) return COUNTRIES.reduce((a, b) => (Math.hypot(b.c[0] - W / 2, b.c[1] - H / 2) < Math.hypot(a.c[0] - W / 2, a.c[1] - H / 2) ? b : a));
  const [fx, fy] = from.c;
  let best: Country = from;
  let bestScore = Infinity;
  for (const c of COUNTRIES) {
    if (c.id === from.id) continue;
    const dx = c.c[0] - fx;
    const dy = c.c[1] - fy;
    const primary = dir === "left" ? -dx : dir === "right" ? dx : dir === "up" ? -dy : dy;
    if (primary <= 1) continue;
    const secondary = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export interface WorldMapProps {
  selected: string | null;
  onSelect: (id: string) => void;
  locked: boolean;
  /** After reveal: the right answer, highlighted and zoomed to. */
  correctId: string | null;
  accent: string;
}

export function WorldMap({ selected, onSelect, locked, correctId, accent }: WorldMapProps) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [dragging, setDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; startDist: number; startView: View; last: { x: number; y: number } } | null>(null);

  const byId = useMemo(() => new Map(COUNTRIES.map((c) => [c.id, c])), []);

  // Zoom to the correct country on reveal.
  useEffect(() => {
    if (!correctId) return;
    const c = byId.get(correctId);
    if (!c) return;
    const t = setTimeout(() => setView(fitBox(c.b)), 250);
    return () => clearTimeout(t);
  }, [correctId, byId]);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * W, y: ((clientY - rect.top) / rect.height) * H };
  }, []);

  // Wheel zoom (desktop). Non-passive so the page doesn't scroll while zooming.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      setView((v) => zoomAt(v, e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toSvg]);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    svgRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    gesture.current = {
      moved: 0,
      startDist: pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      startView: view,
      last: { x: e.clientX, y: e.clientY },
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = W / rect.width;
    if (pts.length === 2 && g.startDist > 0) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = toSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      g.moved += 10;
      setView(zoomAt(g.startView, dist / g.startDist, mid.x, mid.y));
      return;
    }
    const dx = (e.clientX - g.last.x) * scale;
    const dy = (e.clientY - g.last.y) * scale;
    g.moved += Math.abs(e.clientX - g.last.x) + Math.abs(e.clientY - g.last.y);
    g.last = { x: e.clientX, y: e.clientY };
    if (g.moved > 6) setView((v) => clampView({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    const wasTap = g && g.moved <= 6 && pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      gesture.current = null;
      setDragging(false);
    }
    if (!wasTap || locked) return;
    const target = (document.elementFromPoint(e.clientX, e.clientY) as Element | null)?.closest("[data-country]");
    const id = target?.getAttribute("data-country");
    if (id) onSelect(id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const dirs: Record<string, "up" | "down" | "left" | "right"> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (dirs[e.key] && !locked) {
      e.preventDefault();
      const next = neighbour(selected ? byId.get(selected) : undefined, dirs[e.key]);
      onSelect(next.id);
      setAnnounce(next.name);
      if (view.k > 1) setView((v) => clampView({ ...v, x: W / 2 - next.c[0] * v.k, y: H / 2 - next.c[1] * v.k }));
    } else if (e.key === "+" || e.key === "=") {
      setView((v) => zoomAt(v, 1.5, W / 2, H / 2));
    } else if (e.key === "-") {
      setView((v) => zoomAt(v, 1 / 1.5, W / 2, H / 2));
    }
  };

  const fill = (c: Country) => {
    if (correctId && c.id === correctId) return "#B9F46D";
    if (correctId && c.id === selected) return "#FF7A8A";
    if (c.id === selected) return accent;
    if (c.id === hover && !locked) return "#46548A";
    return "#2E3860";
  };

  return (
    <div>
    <div className="relative overflow-hidden rounded-2xl border border-line bg-[#0D1A2E]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={cn("block h-auto w-full touch-none select-none", !locked && "cursor-pointer")}
        role="application"
        aria-label="World map. Tap a country to select it, drag to pan, pinch or use the zoom buttons. Keyboard: arrow keys move between countries, plus and minus zoom."
        aria-roledescription="interactive map"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
      >
        <defs>
          <radialGradient id="ocean" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#13264A" />
            <stop offset="100%" stopColor="#0A1426" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#ocean)" />
        <g
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            transformOrigin: "0 0",
            transformBox: "view-box",
            transition: reduce || dragging ? "none" : "transform 450ms var(--ease-arrive)",
          }}
        >
          {COUNTRIES.map((c) => (
            <path
              key={c.id}
              d={c.d}
              data-country={c.id}
              fill={fill(c)}
              stroke="#0B1020"
              strokeWidth={0.6 / view.k}
              onPointerEnter={() => setHover(c.id)}
              style={{ transition: "fill 180ms" }}
            />
          ))}
          {/* Selection ring drawn on top so small countries stay visible */}
          {(selected || correctId) &&
            [correctId, selected].filter(Boolean).map((id) => {
              const c = byId.get(id!);
              if (!c) return null;
              return (
                <path key={`ring-${id}`} d={c.d} fill="none" stroke="#F8FAFF" strokeWidth={1.4 / view.k} pointerEvents="none" />
              );
            })}
        </g>
      </svg>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
    {/* Controls sit below the map so they never cover countries on small screens. */}
    <div className="mt-2 flex items-center gap-1.5">
      {[
        { label: "Zoom in", icon: Plus, fn: () => setView((v) => zoomAt(v, 1.6, W / 2, H / 2)) },
        { label: "Zoom out", icon: Minus, fn: () => setView((v) => zoomAt(v, 1 / 1.6, W / 2, H / 2)) },
        { label: "Reset view", icon: RotateCcw, fn: () => setView({ k: 1, x: 0, y: 0 }) },
      ].map(({ label, icon: Icon, fn }) => (
        <button
          key={label}
          type="button"
          onClick={fn}
          aria-label={label}
          className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong bg-surface-2/70 text-fg transition-colors hover:bg-surface-2"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
      <span className="ml-2 hidden text-xs text-fg-muted sm:inline">Scroll or pinch to zoom · drag to pan</span>
      <span className="ml-2 text-xs text-fg-muted sm:hidden">Pinch to zoom · drag to pan</span>
    </div>
    </div>
  );
}

export function countryName(id: string): string | undefined {
  return COUNTRIES.find((c) => c.id === id)?.name;
}
