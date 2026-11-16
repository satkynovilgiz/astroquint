import "server-only";
import { dailySelection } from "./daily-selection";
import { formatCountdown, msUntilNextUtcDay, utcDayKey } from "@/features/daily/time";
import { randomId } from "@/lib/utils/random";
import { ApiError } from "./http";
import { getStore } from "./store";
import { newMatch, payloadFor, type MatchPayload } from "./games";
import { ensureProfile } from "./profiles";

/** Day 1 of Daily Orbit. */
export const DAILY_EPOCH = "2026-11-15";

export function dailyNumber(date: string): number {
  return Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${DAILY_EPOCH}T00:00:00Z`)) / 86_400_000) + 1;
}

export { dailySelection };

export async function dailyQuestions(date: string): Promise<string[]> {
  const store = getStore();
  return (await store.getDailyQuestions(date)) ?? store.ensureDailyQuestions(date, dailySelection(date));
}

export function rankedMatchId(date: string, playerId: string): string {
  return `d-${date}-${playerId}`;
}

export async function startDaily(playerId: string, practice: boolean, now = Date.now()): Promise<MatchPayload> {
  const store = getStore();
  await ensureProfile(playerId, now);
  const date = utcDayKey(now);
  const questionIds = await dailyQuestions(date);
  // Everyone sees the same option order today.
  const seed = `daily:${date}`;

  if (!practice) {
    const done = await store.getDailyResult(date, playerId);
    if (done) throw new ApiError(409, "already_played", "You've already played today's ranked Daily Orbit. Practice runs are still available.");
    const id = rankedMatchId(date, playerId);
    const existing = await store.getMatch(id);
    if (existing) return payloadFor(existing, now); // resume the single ranked attempt
    const match = newMatch({ id, mode: "daily", playerId, dailyDate: date, ranked: true, questionIds, seed, now });
    if (!(await store.createMatch(match))) {
      const raced = await store.getMatch(id);
      if (raced) return payloadFor(raced, now);
      throw new ApiError(409, "conflict", "Couldn't start the match. Please retry.");
    }
    return payloadFor(match, now);
  }

  const match = newMatch({ id: `p-${randomId(10)}`, mode: "daily-practice", playerId, dailyDate: date, ranked: false, questionIds, seed, now });
  await store.createMatch(match);
  return payloadFor(match, now);
}

export async function dailyStatus(playerId: string | null, now = Date.now()) {
  const store = getStore();
  const date = utcDayKey(now);
  const [leaderboard, result, inProgress] = await Promise.all([
    store.leaderboard(date, 20),
    playerId ? store.getDailyResult(date, playerId) : Promise.resolve(null),
    playerId ? store.getMatch(rankedMatchId(date, playerId)) : Promise.resolve(null),
  ]);
  const rank = result ? await store.rankFor(date, result.score) : null;
  return {
    date,
    number: dailyNumber(date),
    resetsInMs: msUntilNextUtcDay(now),
    resetsIn: formatCountdown(msUntilNextUtcDay(now)),
    serverNow: now,
    result: result ? { score: result.score, correct: result.correct, matchId: result.matchId, rank } : null,
    inProgressMatchId: !result && inProgress && inProgress.completedAt === null ? inProgress.id : null,
    leaderboard: leaderboard.map((r) => ({ rank: r.rank, displayName: r.displayName, score: r.score, correct: r.correct, isYou: r.playerId === playerId })),
    storage: store.kind,
  };
}
