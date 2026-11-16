import { describe, expect, it } from "vitest";
import {
  clampRemaining,
  isValidWager,
  maxWager,
  resolveFinalBet,
  scoreRound,
  speedBonus,
} from "@/features/scoring/scoring";

describe("speedBonus", () => {
  it("is 100 at full time and 0 at no time", () => {
    expect(speedBonus(20_000, 20_000)).toBe(100);
    expect(speedBonus(0, 20_000)).toBe(0);
  });
  it("rounds proportionally for 20s and 25s rounds", () => {
    expect(speedBonus(10_000, 20_000)).toBe(50);
    expect(speedBonus(12_345, 20_000)).toBe(62); // 61.725
    expect(speedBonus(12_500, 25_000)).toBe(50);
    expect(speedBonus(1, 25_000)).toBe(0);
  });
  it("clamps out-of-range and non-finite remaining time", () => {
    expect(speedBonus(99_999, 20_000)).toBe(100);
    expect(speedBonus(-500, 20_000)).toBe(0);
    expect(clampRemaining(Number.NaN, 20_000)).toBe(0);
    expect(clampRemaining(Infinity, 20_000)).toBe(0);
  });
});

describe("scoreRound", () => {
  it("awards 100 + speed bonus for a correct answer, max 200", () => {
    expect(scoreRound({ outcome: "correct", remainingMs: 20_000, timeLimitMs: 20_000 })).toBe(200);
    expect(scoreRound({ outcome: "correct", remainingMs: 5_000, timeLimitMs: 20_000 })).toBe(125);
    expect(scoreRound({ outcome: "correct", remainingMs: 0, timeLimitMs: 20_000 })).toBe(100);
  });
  it("awards 0 for incorrect answers and timeouts", () => {
    expect(scoreRound({ outcome: "incorrect", remainingMs: 19_000, timeLimitMs: 20_000 })).toBe(0);
    expect(scoreRound({ outcome: "timeout", remainingMs: 0, timeLimitMs: 20_000 })).toBe(0);
  });
});

describe("wagers", () => {
  it("caps the wager at min(300, score)", () => {
    expect(maxWager(820)).toBe(300);
    expect(maxWager(140)).toBe(140);
    expect(maxWager(0)).toBe(0);
    expect(maxWager(-10)).toBe(0);
  });
  it("rejects non-integer, negative, or over-balance wagers", () => {
    expect(isValidWager(150, 140)).toBe(false);
    expect(isValidWager(-1, 500)).toBe(false);
    expect(isValidWager(10.5, 500)).toBe(false);
    expect(isValidWager(300, 500)).toBe(true);
    expect(isValidWager(0, 0)).toBe(true);
  });
});

describe("resolveFinalBet", () => {
  it("adds round points and the wager when correct", () => {
    expect(resolveFinalBet({ scoreBefore: 600, wager: 300, outcome: "correct", remainingMs: 10_000, timeLimitMs: 20_000 })).toEqual({
      roundPoints: 150,
      wagerDelta: 300,
      total: 1050,
    });
  });
  it("subtracts the wager when incorrect or timed out", () => {
    expect(resolveFinalBet({ scoreBefore: 600, wager: 200, outcome: "incorrect", remainingMs: 10_000, timeLimitMs: 20_000 }).total).toBe(400);
    expect(resolveFinalBet({ scoreBefore: 600, wager: 200, outcome: "timeout", remainingMs: 0, timeLimitMs: 20_000 }).total).toBe(400);
  });
  it("never goes below zero", () => {
    expect(resolveFinalBet({ scoreBefore: 120, wager: 120, outcome: "incorrect", remainingMs: 0, timeLimitMs: 20_000 }).total).toBe(0);
  });
  it("throws on a wager above the allowed balance", () => {
    expect(() => resolveFinalBet({ scoreBefore: 100, wager: 101, outcome: "correct", remainingMs: 0, timeLimitMs: 20_000 })).toThrow(RangeError);
  });
});
