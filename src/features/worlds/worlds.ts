/**
 * The five Astroquint worlds. This file is the single source of truth for a
 * world's identity, rules and palette. Gameplay modules (Milestone 2) attach
 * their mechanics to these ids; presentation reads palettes from here.
 */

export const WORLD_IDS = ["pattern-break", "truth-trap", "timeline", "geotap", "final-bet"] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export type InteractionKind = "multiple-choice" | "spot-the-false" | "ordering" | "map-select" | "wager";

export interface WorldPalette {
  /** Main planet / accent color. */
  primary: string;
  /** Lighter highlight used on the lit side of the planet. */
  highlight: string;
  /** Deep shadow side of the planet. */
  shadow: string;
  /** Atmospheric glow. */
  glow: string;
  /** Text-safe accent for labels on dark surfaces (≥ 4.5:1 on #0B1020). */
  text: string;
}

export interface WorldDefinition {
  id: WorldId;
  /** 1-based position in a game. */
  order: number;
  code: string;
  name: string;
  theme: string;
  skill: string;
  summary: string;
  interaction: InteractionKind;
  /** Answer window in milliseconds. */
  timeLimitMs: number;
  palette: WorldPalette;
  /** Emoji used in text share cards. */
  shareGlyph: string;
  /** Planet surface style. */
  surface: "rings" | "bubbles" | "dunes" | "continents" | "crown";
}

export const WORLDS: readonly WorldDefinition[] = [
  {
    id: "pattern-break",
    order: 1,
    code: "W01",
    name: "Pattern Break",
    theme: "Logic & patterns",
    skill: "Logic",
    summary: "Crack the rule hiding inside a sequence and pick what comes next.",
    interaction: "multiple-choice",
    timeLimitMs: 20_000,
    palette: { primary: "#9167F4", highlight: "#C7B2FF", shadow: "#2B1B63", glow: "#9167F4", text: "#BFA8FF" },
    shareGlyph: "🟣",
    surface: "rings",
  },
  {
    id: "truth-trap",
    order: 2,
    code: "W02",
    name: "Truth Trap",
    theme: "Knowledge & surprising facts",
    skill: "Knowledge",
    summary: "Three statements, one lie. Find the false one before time runs out.",
    interaction: "spot-the-false",
    timeLimitMs: 20_000,
    palette: { primary: "#8FD44A", highlight: "#D9FFA8", shadow: "#1E4A1A", glow: "#B9F46D", text: "#B9F46D" },
    shareGlyph: "🟢",
    surface: "bubbles",
  },
  {
    id: "timeline",
    order: 3,
    code: "W03",
    name: "Timeline",
    theme: "History, culture & inventions",
    skill: "History",
    summary: "Drag scattered moments back into the order they really happened.",
    interaction: "ordering",
    timeLimitMs: 20_000,
    palette: { primary: "#FF9A57", highlight: "#FFD6B5", shadow: "#6B2A12", glow: "#FFB681", text: "#FFB681" },
    shareGlyph: "🟠",
    surface: "dunes",
  },
  {
    id: "geotap",
    order: 4,
    code: "W04",
    name: "GeoTap",
    theme: "Geography & exploration",
    skill: "Geography",
    summary: "Read the clue, then tap the right country on the map.",
    interaction: "map-select",
    timeLimitMs: 25_000,
    palette: { primary: "#2BC4B4", highlight: "#A8F2E8", shadow: "#0B3B4F", glow: "#3DD6C4", text: "#5FE3D3" },
    shareGlyph: "🔵",
    surface: "continents",
  },
  {
    id: "final-bet",
    order: 5,
    code: "W05",
    name: "Final Bet",
    theme: "Risk & strategy",
    skill: "Strategy",
    summary: "Wager up to 300 of your points, then face the toughest question.",
    interaction: "wager",
    timeLimitMs: 20_000,
    palette: { primary: "#E8B23A", highlight: "#FFE9A8", shadow: "#5A3A08", glow: "#F5C451", text: "#F5C451" },
    shareGlyph: "🟡",
    surface: "crown",
  },
] as const;

export function getWorld(id: WorldId): WorldDefinition {
  const world = WORLDS.find((w) => w.id === id);
  if (!world) throw new Error(`Unknown world: ${id}`);
  return world;
}

export function nextWorld(id: WorldId): WorldDefinition | null {
  const current = getWorld(id);
  return WORLDS.find((w) => w.order === current.order + 1) ?? null;
}
