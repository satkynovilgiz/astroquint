import { getQuestion } from "@/features/questions/bank";
import { presentQuestion } from "@/features/questions/present";
import type { RoundOutcome } from "@/features/scoring/scoring";
import type { GameState } from "./engine";
import type { GameView } from "./controller";
import { summarize } from "./summary";

export function questionTitle(questionId: string): string {
  const q = getQuestion(questionId);
  if (!q) return "";
  switch (q.world) {
    case "pattern-break":
      return q.sequence.join(", ");
    case "truth-trap":
      return `Find the false statement: ${q.topic}`;
    default:
      return q.prompt;
  }
}

function reviewEntry(questionId: string, outcome: RoundOutcome | null) {
  const q = getQuestion(questionId)!;
  return { worldId: q.world, title: questionTitle(questionId), explanation: q.explanation, outcome };
}

/**
 * Project engine state into the player-facing view model. Never includes
 * unrevealed solutions: the question is presented, the reveal only appears
 * once the round is locked. Deadlines are in the caller's clock.
 */
export function toView(game: GameState, opts: { clockOffsetMs?: number } = {}): GameView {
  const round = game.rounds[game.roundIndex];
  const showQuestion = game.phase === "playing" || game.phase === "revealed";
  const q = getQuestion(round.questionId)!;
  const offset = opts.clockOffsetMs ?? 0;
  return {
    phase: game.phase,
    roundIndex: game.roundIndex,
    worldId: round.worldId,
    question: showQuestion ? presentQuestion(q, game.seed) : null,
    deadline: round.deadline === null ? null : round.deadline - offset,
    relaxed: game.relaxed,
    score: game.score,
    rounds: game.rounds.map((r) => ({ worldId: r.worldId, outcome: r.outcome, points: r.points, wager: r.wager, wagerDelta: r.wagerDelta })),
    reveal: game.phase === "revealed" || game.phase === "travel" || game.phase === "complete" ? round.reveal : null,
    submitted: round.answer,
    wager: round.wager,
    summary: game.phase === "complete" ? summarize(game.rounds, game.score, game.relaxed) : null,
    review: game.phase === "complete" ? game.rounds.map((r) => reviewEntry(r.questionId, r.outcome)) : null,
    busy: false,
    error: null,
  };
}
