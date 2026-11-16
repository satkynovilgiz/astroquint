import "server-only";
import { createGame, gameReducer, type GameAction, type GameState } from "@/features/gameplay/engine";
import { summarize } from "@/features/gameplay/summary";
import { toView } from "@/features/gameplay/view";
import type { GameView } from "@/features/gameplay/controller";
import type { GameActionInput } from "@/lib/validation/game";
import { ApiError } from "./http";
import { getStore, type MatchRecord } from "./store";

/** Network grace: answers arriving up to this long after the deadline still count as on time (with 0 speed bonus). */
export const LATE_GRACE_MS = 400;
const CAS_RETRIES = 4;

export interface MatchPayload {
  matchId: string;
  mode: MatchRecord["mode"];
  ranked: boolean;
  dailyDate: string | null;
  /** Deadlines in `view` use the server clock; clients correct with serverNow. */
  view: GameView;
  serverNow: number;
  rank?: { rank: number; total: number } | null;
  newAchievements?: string[];
}

export function payloadFor(match: MatchRecord, now: number, extra: Partial<MatchPayload> = {}): MatchPayload {
  return { matchId: match.id, mode: match.mode, ranked: match.ranked, dailyDate: match.dailyDate, view: toView(match.state), serverNow: now, ...extra };
}

export function newMatch(input: { id: string; mode: MatchRecord["mode"]; playerId: string; dailyDate: string | null; ranked: boolean; questionIds: string[]; seed: string; now: number }): MatchRecord {
  const state = createGame({ id: input.id, seed: input.seed, questionIds: input.questionIds, now: input.now });
  return { id: input.id, mode: input.mode, playerId: input.playerId, dailyDate: input.dailyDate, ranked: input.ranked, state, version: 0, createdAt: input.now, completedAt: null };
}

function toEngineAction(input: GameActionInput, state: GameState, now: number): GameAction {
  switch (input.type) {
    case "begin":
    case "timeout":
      return { type: input.type, now };
    case "lockWager":
      return { type: "lockWager", wager: input.wager, now };
    case "submit": {
      // Absorb small network delay: within the grace window, judge as if received at the deadline.
      const deadline = state.rounds[state.roundIndex]?.deadline;
      const effective = deadline !== null && deadline !== undefined && now > deadline && now <= deadline + LATE_GRACE_MS ? deadline : now;
      return { type: "submit", answer: input.answer, now: effective };
    }
    case "continue":
      return { type: "continue" };
    case "arrive":
      return { type: "arrive" };
  }
}

export async function loadOwnedMatch(matchId: string, playerId: string): Promise<MatchRecord> {
  const match = await getStore().getMatch(matchId);
  // Same error for "missing" and "not yours" so ids can't be probed.
  if (!match || match.playerId !== playerId) throw new ApiError(404, "not_found", "Match not found");
  return match;
}

/**
 * Apply one player action using the server clock. Concurrent requests are
 * serialised with compare-and-swap; a duplicate submit is a no-op because the
 * engine ignores out-of-phase actions and the submissions table rejects a
 * second row for the same round.
 */
export async function applyMatchAction(matchId: string, playerId: string, input: GameActionInput, now = Date.now()): Promise<MatchPayload> {
  const store = getStore();
  for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
    const match = await loadOwnedMatch(matchId, playerId);
    const before = match.state;
    const after = gameReducer(before, toEngineAction(input, before, now));
    if (after === before) return payloadFor(match, now);

    const completedAt = after.phase === "complete" && match.completedAt === null ? now : match.completedAt;
    const ok = await store.updateMatch(match.id, match.version, { state: after, completedAt });
    if (!ok) continue; // lost a race; reload and re-evaluate

    const updated: MatchRecord = { ...match, state: after, completedAt, version: match.version + 1 };
    const round = after.rounds[after.roundIndex];
    const settled = before.rounds[before.roundIndex].outcome === null && round.outcome !== null && after.roundIndex === before.roundIndex;
    if (settled) {
      await store.insertSubmission({
        matchId: match.id,
        roundIndex: after.roundIndex,
        playerId,
        questionId: round.questionId,
        answer: round.answer,
        receivedAt: now,
        outcome: round.outcome!,
        points: round.points + (round.wagerDelta ?? 0),
      });
    }

    if (after.phase === "complete" && before.phase !== "complete") {
      return finalizeMatch(updated, now);
    }
    return payloadFor(updated, now);
  }
  throw new ApiError(409, "conflict", "This match was updated elsewhere. Please retry.");
}

async function finalizeMatch(match: MatchRecord, now: number): Promise<MatchPayload> {
  const store = getStore();
  const summary = summarize(match.state.rounds, match.state.score, match.state.relaxed);
  let rank: MatchPayload["rank"] = null;
  if (match.ranked && match.dailyDate) {
    await store.insertDailyResult({
      date: match.dailyDate,
      playerId: match.playerId,
      matchId: match.id,
      score: match.state.score,
      correct: summary.correct,
      completedAt: now,
    });
    rank = await store.rankFor(match.dailyDate, match.state.score);
  }
  const added = await store.unlockAchievements(
    summary.achievements.map((achievementId) => ({ playerId: match.playerId, achievementId, matchId: match.id, unlockedAt: now })),
  );
  return payloadFor(match, now, { rank, newAchievements: added.map((a) => a.achievementId) });
}
