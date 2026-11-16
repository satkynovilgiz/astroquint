import { WORLDS, type WorldId } from "@/features/worlds/worlds";
import { evaluateAchievements, type AchievementId } from "@/features/achievements/achievements";
import type { RoundOutcome } from "@/features/scoring/scoring";

export interface SummaryRound {
  worldId: WorldId;
  outcome: RoundOutcome | null;
  points: number;
  startedAt: number | null;
  submittedAt: number | null;
  wager: number | null;
  wagerDelta: number | null;
}

export interface GameSummary {
  total: number;
  correct: number;
  accuracy: number;
  fastestMs: number | null;
  perWorld: { worldId: WorldId; outcome: RoundOutcome | null; points: number; elapsedMs: number | null; wagerDelta: number | null }[];
  wager: { amount: number; delta: number } | null;
  achievements: AchievementId[];
}

export function summarize(rounds: SummaryRound[], total: number, relaxed: boolean): GameSummary {
  const perWorld = rounds.map((r) => ({
    worldId: r.worldId,
    outcome: r.outcome,
    points: r.points,
    elapsedMs: r.startedAt !== null && r.submittedAt !== null ? Math.max(0, r.submittedAt - r.startedAt) : null,
    wagerDelta: r.wagerDelta,
  }));
  const correct = rounds.filter((r) => r.outcome === "correct").length;
  const answeredTimes = perWorld.filter((r) => r.outcome === "correct" && r.elapsedMs !== null).map((r) => r.elapsedMs!);
  const final = rounds.find((r) => r.worldId === "final-bet");
  return {
    total,
    correct,
    accuracy: rounds.length ? Math.round((correct / rounds.length) * 100) : 0,
    fastestMs: answeredTimes.length ? Math.min(...answeredTimes) : null,
    perWorld,
    wager: final && final.wager !== null ? { amount: final.wager, delta: final.wagerDelta ?? 0 } : null,
    achievements: evaluateAchievements({
      rounds: perWorld.map((r, i) => ({ worldId: r.worldId, outcome: r.outcome, elapsedMs: r.elapsedMs, wager: rounds[i].wager })),
      total,
      relaxed,
    }),
  };
}

/** Spoiler-free text result for sharing. */
export function shareText(summary: GameSummary, title: string, url?: string): string {
  const lines = summary.perWorld.map((r) => {
    const world = WORLDS.find((w) => w.id === r.worldId)!;
    return `${world.shareGlyph} ${r.outcome === "correct" ? "✅" : "❌"}`;
  });
  const conquered = summary.correct === 1 ? "1 of 5 worlds conquered." : `${summary.correct} of 5 worlds conquered.`;
  return [`ASTROQUINT 🪐`, title, "", ...lines, "", `Score: ${summary.total}`, conquered, url].filter((l) => l !== undefined).join("\n");
}
