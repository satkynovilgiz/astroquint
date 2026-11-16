import { describe, expect, it } from "vitest";
import { createGame, gameReducer, type GameState } from "@/features/gameplay/engine";
import { revealFor } from "@/features/questions/present";
import { getQuestion } from "@/features/questions/bank";
import type { Answer } from "@/features/questions/types";
import { summarize } from "@/features/gameplay/summary";

const IDS = ["pb-001", "tt-001", "tl-001", "gt-001", "fb-001"];
const T0 = 1_000_000;

function correctAnswer(state: GameState): Answer {
  const r = state.rounds[state.roundIndex];
  return revealFor(getQuestion(r.questionId)!, state.seed).correctAnswer;
}
function wrongAnswer(state: GameState): Answer {
  const a = correctAnswer(state);
  if (a.kind === "choice") return { kind: "choice", index: (a.index + 1) % (state.rounds[state.roundIndex].worldId === "truth-trap" ? 3 : 4) };
  if (a.kind === "order") return { kind: "order", ids: [...a.ids].reverse() };
  return { kind: "country", id: "076" };
}

function play(state: GameState, steps: ("right" | "wrong" | "timeout")[], wager = 0, answerAfterMs = 5000): GameState {
  let s = state;
  let now = T0;
  for (const step of steps) {
    s = gameReducer(s, { type: "begin", now });
    if (s.phase === "wager") s = gameReducer(s, { type: "lockWager", wager, now });
    if (step === "timeout") {
      now += 30_000;
      s = gameReducer(s, { type: "timeout", now });
    } else {
      now += answerAfterMs;
      s = gameReducer(s, { type: "submit", answer: step === "right" ? correctAnswer(s) : wrongAnswer(s), now });
    }
    s = gameReducer(s, { type: "continue" });
    s = gameReducer(s, { type: "arrive" });
    now += 3000;
  }
  return s;
}

describe("game engine", () => {
  const fresh = () => createGame({ id: "g1", questionIds: IDS, now: T0 });

  it("scores a correct answer with speed bonus (15s left of 20s → 175)", () => {
    let s = gameReducer(fresh(), { type: "begin", now: T0 });
    s = gameReducer(s, { type: "submit", answer: correctAnswer(s), now: T0 + 5000 });
    expect(s.phase).toBe("revealed");
    expect(s.rounds[0]).toMatchObject({ outcome: "correct", points: 175, remainingMs: 15000 });
    expect(s.score).toBe(175);
  });

  it("scores 0 for an incorrect answer and reveals the solution", () => {
    let s = gameReducer(fresh(), { type: "begin", now: T0 });
    s = gameReducer(s, { type: "submit", answer: wrongAnswer(s), now: T0 + 1000 });
    expect(s.rounds[0].outcome).toBe("incorrect");
    expect(s.score).toBe(0);
    expect(s.rounds[0].reveal?.correct).toBe(false);
  });

  it("ignores duplicate submissions", () => {
    let s = gameReducer(fresh(), { type: "begin", now: T0 });
    s = gameReducer(s, { type: "submit", answer: correctAnswer(s), now: T0 + 1000 });
    const again = gameReducer(s, { type: "submit", answer: correctAnswer(s), now: T0 + 1100 });
    expect(again).toBe(s);
    expect(again.score).toBe(s.score);
  });

  it("ignores invalid answers without consuming the round", () => {
    let s = gameReducer(fresh(), { type: "begin", now: T0 });
    const after = gameReducer(s, { type: "submit", answer: { kind: "choice", index: 99 }, now: T0 + 1000 });
    expect(after).toBe(s);
    expect(after.phase).toBe("playing");
    s = after;
  });

  it("treats answers after the deadline as timeouts", () => {
    let s = gameReducer(fresh(), { type: "begin", now: T0 });
    s = gameReducer(s, { type: "submit", answer: correctAnswer(s), now: T0 + 20_001 });
    expect(s.rounds[0]).toMatchObject({ outcome: "timeout", points: 0 });
  });

  it("only times out once the deadline has passed", () => {
    let s = gameReducer(fresh(), { type: "begin", now: T0 });
    expect(gameReducer(s, { type: "timeout", now: T0 + 19_999 })).toBe(s);
    s = gameReducer(s, { type: "timeout", now: T0 + 20_000 });
    expect(s.rounds[0].outcome).toBe("timeout");
  });

  it("advances through travel to the next world", () => {
    let s = gameReducer(fresh(), { type: "begin", now: T0 });
    s = gameReducer(s, { type: "submit", answer: correctAnswer(s), now: T0 + 1000 });
    s = gameReducer(s, { type: "continue" });
    expect(s.phase).toBe("travel");
    s = gameReducer(s, { type: "arrive" });
    expect(s).toMatchObject({ phase: "intro", roundIndex: 1 });
  });

  it("requires a wager before the final question and rejects invalid wagers", () => {
    let s = play(fresh(), ["right", "right", "right", "right"]);
    expect(s.roundIndex).toBe(4);
    s = gameReducer(s, { type: "begin", now: T0 });
    expect(s.phase).toBe("wager");
    expect(gameReducer(s, { type: "lockWager", wager: s.score + 1, now: T0 })).toBe(s);
    expect(gameReducer(s, { type: "lockWager", wager: 301, now: T0 })).toBe(s);
    s = gameReducer(s, { type: "lockWager", wager: 300, now: T0 });
    expect(s.phase).toBe("playing");
    expect(s.rounds[4].wager).toBe(300);
  });

  it("adds the wager on a correct final and completes the game", () => {
    const s = play(fresh(), ["right", "right", "right", "right", "right"], 300);
    expect(s.phase).toBe("complete");
    // four 20s rounds at 15s left (175) + GeoTap 25s at 20s left (180) + 300 wager
    expect(s.score).toBe(4 * 175 + 180 + 300);
    const summary = summarize(s.rounds, s.score, s.relaxed);
    expect(summary.correct).toBe(5);
    expect(summary.accuracy).toBe(100);
    expect(summary.achievements).toEqual(expect.arrayContaining(["perfect-orbit", "galaxy-genius", "high-roller", "planet-hopper", "logic-explorer", "timeline-master"]));
  });

  it("subtracts the wager on a wrong final, never below zero", () => {
    const s = play(fresh(), ["right", "wrong", "wrong", "wrong", "wrong"], 175);
    expect(s.score).toBe(0);
    const t = play(fresh(), ["timeout", "timeout", "timeout", "timeout", "timeout"], 0);
    expect(t.score).toBe(0);
    expect(summarize(t.rounds, t.score, false).fastestMs).toBeNull();
  });

  it("relaxed mode has no deadline and no speed bonus", () => {
    let s = createGame({ id: "g2", questionIds: IDS, now: T0, relaxed: true });
    s = gameReducer(s, { type: "begin", now: T0 });
    expect(s.rounds[0].deadline).toBeNull();
    expect(gameReducer(s, { type: "timeout", now: T0 + 999_999 })).toBe(s);
    s = gameReducer(s, { type: "submit", answer: correctAnswer(s), now: T0 + 999_999 });
    expect(s.rounds[0].points).toBe(100);
  });

  it("rejects games built with mismatched questions", () => {
    expect(() => createGame({ id: "x", questionIds: ["tt-001", "pb-001", "tl-001", "gt-001", "fb-001"], now: T0 })).toThrow();
  });
});
