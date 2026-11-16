/**
 * Deterministic scoring rules. Pure functions only — the server (Milestone 3)
 * runs these same functions against server-recorded timestamps, so the client
 * can never award itself points.
 */

export const BASE_POINTS = 100;
export const MAX_SPEED_BONUS = 100;
export const MAX_WAGER = 300;

export type RoundOutcome = "correct" | "incorrect" | "timeout";

/** Clamp remaining time into [0, timeLimitMs]. Non-finite input counts as no time left. */
export function clampRemaining(remainingMs: number, timeLimitMs: number): number {
  if (!Number.isFinite(remainingMs) || timeLimitMs <= 0) return 0;
  return Math.min(Math.max(remainingMs, 0), timeLimitMs);
}

/** speedBonus = round(100 × remaining / limit) */
export function speedBonus(remainingMs: number, timeLimitMs: number): number {
  if (timeLimitMs <= 0) return 0;
  return Math.round((MAX_SPEED_BONUS * clampRemaining(remainingMs, timeLimitMs)) / timeLimitMs);
}

export interface RoundScoreInput {
  outcome: RoundOutcome;
  remainingMs: number;
  timeLimitMs: number;
}

/** Ordinary round: correct = 100 + speed bonus (max 200); otherwise 0. */
export function scoreRound({ outcome, remainingMs, timeLimitMs }: RoundScoreInput): number {
  if (outcome !== "correct") return 0;
  return BASE_POINTS + speedBonus(remainingMs, timeLimitMs);
}

/** Largest wager allowed for a given current score: min(300, score), never negative. */
export function maxWager(currentScore: number): number {
  return Math.max(0, Math.min(MAX_WAGER, Math.floor(currentScore)));
}

export function isValidWager(wager: number, currentScore: number): boolean {
  return Number.isInteger(wager) && wager >= 0 && wager <= maxWager(currentScore);
}

export interface FinalBetInput extends RoundScoreInput {
  scoreBefore: number;
  wager: number;
}

export interface FinalBetResult {
  roundPoints: number;
  wagerDelta: number;
  total: number;
}

/**
 * Final Bet: correct → round points + wager; incorrect/timeout → lose the wager.
 * Total can never drop below zero. Throws on an invalid wager so a bad value
 * can never be silently scored.
 */
export function resolveFinalBet(input: FinalBetInput): FinalBetResult {
  const { scoreBefore, wager } = input;
  if (!isValidWager(wager, scoreBefore)) {
    throw new RangeError(`Invalid wager ${wager} for score ${scoreBefore}`);
  }
  const roundPoints = scoreRound(input);
  const wagerDelta = input.outcome === "correct" ? wager : -wager;
  const total = Math.max(0, scoreBefore + roundPoints + wagerDelta);
  return { roundPoints, wagerDelta, total };
}
