import type { RoundOutcome } from "@/features/scoring/scoring";
import type { WorldId } from "@/features/worlds/worlds";

/**
 * Achievements and their exact, deterministic unlock rules. Evaluated from a
 * finished run's round records only — never from client-claimed flags.
 */

export type AchievementId = "planet-hopper" | "logic-explorer" | "timeline-master" | "high-roller" | "perfect-orbit" | "galaxy-genius";

export interface AchievementRound {
  worldId: WorldId;
  outcome: RoundOutcome | null;
  elapsedMs: number | null;
  wager: number | null;
}

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  rule: string;
  glyph: string;
  test: (input: { rounds: AchievementRound[]; total: number; relaxed: boolean }) => boolean;
}

const correct = (rounds: AchievementRound[], world: WorldId) => rounds.find((r) => r.worldId === world)?.outcome === "correct";

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: "planet-hopper",
    name: "Planet Hopper",
    rule: "Finish all five worlds in one game.",
    glyph: "🪐",
    test: ({ rounds }) => rounds.length === 5 && rounds.every((r) => r.outcome !== null),
  },
  {
    id: "logic-explorer",
    name: "Logic Explorer",
    rule: "Solve Pattern Break.",
    glyph: "🔮",
    test: ({ rounds }) => correct(rounds, "pattern-break"),
  },
  {
    id: "timeline-master",
    name: "Timeline Master",
    rule: "Get the Timeline order fully right within 10 seconds, with the timer on.",
    glyph: "⏳",
    test: ({ rounds, relaxed }) => {
      const r = rounds.find((x) => x.worldId === "timeline");
      return !relaxed && r?.outcome === "correct" && r.elapsedMs !== null && r.elapsedMs <= 10_000;
    },
  },
  {
    id: "high-roller",
    name: "High Roller",
    rule: "Bet the maximum 300 points in Final Bet and win.",
    glyph: "🎲",
    test: ({ rounds }) => {
      const r = rounds.find((x) => x.worldId === "final-bet");
      return r?.outcome === "correct" && r.wager === 300;
    },
  },
  {
    id: "perfect-orbit",
    name: "Perfect Orbit",
    rule: "Answer all five worlds correctly.",
    glyph: "💫",
    test: ({ rounds }) => rounds.length === 5 && rounds.every((r) => r.outcome === "correct"),
  },
  {
    id: "galaxy-genius",
    name: "Galaxy Genius",
    rule: "Finish with 1,000 points or more.",
    glyph: "🧠",
    test: ({ total }) => total >= 1000,
  },
];

export function evaluateAchievements(input: { rounds: AchievementRound[]; total: number; relaxed: boolean }): AchievementId[] {
  return ACHIEVEMENTS.filter((a) => a.test(input)).map((a) => a.id);
}

export function getAchievement(id: AchievementId): AchievementDefinition {
  return ACHIEVEMENTS.find((a) => a.id === id)!;
}
