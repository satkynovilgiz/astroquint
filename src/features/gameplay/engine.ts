import { WORLDS, type WorldId } from "@/features/worlds/worlds";
import { getQuestion } from "@/features/questions/bank";
import { evaluateAnswer, revealFor } from "@/features/questions/present";
import type { Answer, Reveal } from "@/features/questions/types";
import { isValidWager, resolveFinalBet, scoreRound, type RoundOutcome } from "@/features/scoring/scoring";

/**
 * Pure, serialisable game state machine for a five-world run.
 *
 *   intro ──begin──▶ playing ──submit/timeout──▶ revealed ──continue──▶ travel ──arrive──▶ intro …
 *     └─(Final Bet)─▶ wager ──lockWager──▶ playing                        └─(last)──▶ complete
 *
 * All time values are epoch milliseconds supplied by the caller (the server
 * supplies its own clock for ranked play). Invalid or out-of-phase actions
 * return the same state object, so duplicate submissions can never score twice.
 */

export type Phase = "intro" | "wager" | "playing" | "revealed" | "travel" | "complete";

export interface RoundState {
  worldId: WorldId;
  questionId: string;
  startedAt: number | null;
  deadline: number | null;
  submittedAt: number | null;
  answer: Answer | null;
  outcome: RoundOutcome | null;
  points: number;
  remainingMs: number;
  wager: number | null;
  wagerDelta: number | null;
  reveal: Reveal | null;
}

export interface GameState {
  version: 1;
  id: string;
  /** Seed for deterministic presentation (option order etc.). */
  seed: string;
  createdAt: number;
  /** Untimed accessibility mode: no deadline, no speed bonus. */
  relaxed: boolean;
  roundIndex: number;
  phase: Phase;
  score: number;
  rounds: RoundState[];
}

export type GameAction =
  | { type: "begin"; now: number }
  | { type: "lockWager"; wager: number; now: number }
  | { type: "submit"; answer: Answer; now: number }
  | { type: "timeout"; now: number }
  | { type: "continue" }
  | { type: "arrive" };

export function createGame(input: { id: string; seed?: string; questionIds: string[]; relaxed?: boolean; now: number }): GameState {
  if (input.questionIds.length !== WORLDS.length) throw new Error("A game needs one question per world");
  return {
    version: 1,
    id: input.id,
    seed: input.seed ?? input.id,
    createdAt: input.now,
    relaxed: input.relaxed ?? false,
    roundIndex: 0,
    phase: "intro",
    score: 0,
    rounds: WORLDS.map((w, i) => {
      const q = getQuestion(input.questionIds[i]);
      if (!q || q.world !== w.id) throw new Error(`Question ${input.questionIds[i]} does not belong to ${w.id}`);
      return {
        worldId: w.id,
        questionId: q.id,
        startedAt: null,
        deadline: null,
        submittedAt: null,
        answer: null,
        outcome: null,
        points: 0,
        remainingMs: 0,
        wager: null,
        wagerDelta: null,
        reveal: null,
      };
    }),
  };
}

export function currentRound(state: GameState): RoundState {
  return state.rounds[state.roundIndex];
}

export function timeLimitFor(worldId: WorldId): number {
  return WORLDS.find((w) => w.id === worldId)!.timeLimitMs;
}

function patchRound(state: GameState, patch: Partial<RoundState>): RoundState[] {
  return state.rounds.map((r, i) => (i === state.roundIndex ? { ...r, ...patch } : r));
}

function startRound(state: GameState, now: number, extra: Partial<RoundState> = {}): GameState {
  const round = currentRound(state);
  const deadline = state.relaxed ? null : now + timeLimitFor(round.worldId);
  return { ...state, phase: "playing", rounds: patchRound(state, { ...extra, startedAt: now, deadline }) };
}

function settle(state: GameState, now: number, answer: Answer | null, correct: boolean, reveal: Reveal, expired: boolean): GameState {
  const round = currentRound(state);
  const limit = timeLimitFor(round.worldId);
  const remainingMs = state.relaxed || round.deadline === null ? 0 : Math.max(0, round.deadline - now);
  const outcome: RoundOutcome = expired ? "timeout" : correct ? "correct" : "incorrect";
  // Relaxed mode: base points only (no speed bonus).
  const scoringInput = { outcome, remainingMs, timeLimitMs: limit };

  if (round.worldId === "final-bet") {
    const wager = round.wager ?? 0;
    const result = resolveFinalBet({ ...scoringInput, scoreBefore: state.score, wager });
    return {
      ...state,
      phase: "revealed",
      score: result.total,
      rounds: patchRound(state, {
        submittedAt: answer ? now : null,
        answer,
        outcome,
        points: result.roundPoints,
        remainingMs,
        wagerDelta: result.wagerDelta,
        reveal: { ...reveal, correct: outcome === "correct" },
      }),
    };
  }

  const points = scoreRound(scoringInput);
  return {
    ...state,
    phase: "revealed",
    score: state.score + points,
    rounds: patchRound(state, {
      submittedAt: answer ? now : null,
      answer,
      outcome,
      points,
      remainingMs,
      reveal: { ...reveal, correct: outcome === "correct" },
    }),
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const round = currentRound(state);
  const question = getQuestion(round.questionId);
  if (!question) return state;

  switch (action.type) {
    case "begin":
      if (state.phase !== "intro") return state;
      if (round.worldId === "final-bet") return { ...state, phase: "wager" };
      return startRound(state, action.now);

    case "lockWager":
      if (state.phase !== "wager" || !isValidWager(action.wager, state.score)) return state;
      return startRound(state, action.now, { wager: action.wager });

    case "submit": {
      if (state.phase !== "playing" || round.outcome !== null) return state;
      const evaluation = evaluateAnswer(question, state.seed, action.answer);
      if (!evaluation.valid) return state;
      const expired = round.deadline !== null && action.now > round.deadline;
      return settle(state, action.now, action.answer, evaluation.correct && !expired, evaluation.reveal, expired);
    }

    case "timeout":
      if (state.phase !== "playing" || round.outcome !== null || round.deadline === null || action.now < round.deadline) return state;
      return settle(state, action.now, null, false, revealFor(question, state.seed), true);

    case "continue":
      if (state.phase !== "revealed") return state;
      return { ...state, phase: state.roundIndex === state.rounds.length - 1 ? "complete" : "travel" };

    case "arrive":
      if (state.phase !== "travel") return state;
      return { ...state, phase: "intro", roundIndex: state.roundIndex + 1 };
  }
}
