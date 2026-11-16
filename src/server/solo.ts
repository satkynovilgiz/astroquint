import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createGame, gameReducer, type GameState } from "@/features/gameplay/engine";
import { toView } from "@/features/gameplay/view";
import { selectQuestions } from "@/features/questions/select";
import { getQuestion } from "@/features/questions/bank";
import { evaluateAnswer, revealFor } from "@/features/questions/present";
import type { GameView } from "@/features/gameplay/controller";
import type { GameActionInput } from "@/lib/validation/game";
import { mulberry32, randomId } from "@/lib/utils/random";
import { utcDayKey } from "@/features/daily/time";
import { dailySelection } from "./daily-selection";
import { sessionSecret } from "./env";
import { ApiError } from "./http";
import { LATE_GRACE_MS } from "./games";

/**
 * Solo Orbit runs on the server so the question bank (and its answers) never
 * ships to the browser. To work without a database, the game state travels
 * with the client as a signed token: the server verifies the signature,
 * applies the action with its own clock and returns a new token. Solo is
 * unranked practice, so replaying an older token gains nothing.
 */

const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function sign(payload: string) {
  return createHmac("sha256", `${sessionSecret()}:solo`).update(payload).digest("base64url");
}

export function sealSolo(state: GameState): string {
  // Reveals are re-derivable from (question, seed, answer); drop them to keep tokens small.
  const slim: GameState = { ...state, rounds: state.rounds.map((r) => ({ ...r, reveal: null })) };
  const payload = Buffer.from(JSON.stringify(slim)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function openSolo(token: string, now: number): GameState {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) throw new ApiError(400, "bad_token", "Invalid game token");
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new ApiError(400, "bad_token", "Invalid game token");
  const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GameState;
  if (state.version !== 1 || now - state.createdAt > MAX_AGE_MS) throw new ApiError(410, "expired", "This run has expired. Start a new one.");
  return rehydrateReveals(state);
}

/** Recompute stored reveals by replaying each settled round's answer. */
function rehydrateReveals(state: GameState): GameState {
  return { ...state, rounds: state.rounds.map((r) => (r.outcome === null ? r : { ...r, reveal: revealOf(state, r) })) };
}

function revealOf(state: GameState, r: GameState["rounds"][number]) {
  const q = getQuestion(r.questionId)!;
  const base = r.answer ? (evaluateAnswer(q, state.seed, r.answer) as { valid: true; reveal: ReturnType<typeof revealFor> }).reveal : revealFor(q, state.seed);
  return { ...base, correct: r.outcome === "correct" };
}

export interface SoloPayload {
  token: string;
  view: GameView;
  serverNow: number;
  /** Question ids, only once the run is complete (for "recently seen" on this device). */
  playedIds: string[] | null;
}

function payload(state: GameState, now: number): SoloPayload {
  return { token: sealSolo(state), view: toView(state), serverNow: now, playedIds: state.phase === "complete" ? state.rounds.map((r) => r.questionId) : null };
}

export function startSolo(relaxed: boolean, recent: string[], now = Date.now()): SoloPayload {
  const id = randomId();
  // Never serve today's Daily Orbit questions in practice: their reveals would leak ranked answers.
  const questionIds = selectQuestions(mulberry32(parseInt(id.slice(0, 8), 16)), new Set(recent), new Set(dailySelection(utcDayKey(now))));
  return payload(createGame({ id, questionIds, relaxed, now }), now);
}

export function applySolo(token: string, input: GameActionInput, now = Date.now()): SoloPayload {
  const state = openSolo(token, now);
  const round = state.rounds[state.roundIndex];
  let action;
  switch (input.type) {
    case "submit": {
      const d = round.deadline;
      const effective = d !== null && now > d && now <= d + LATE_GRACE_MS ? d : now;
      action = { type: "submit" as const, answer: input.answer, now: effective };
      break;
    }
    case "lockWager":
      action = { type: "lockWager" as const, wager: input.wager, now };
      break;
    case "begin":
    case "timeout":
      action = { type: input.type, now };
      break;
    default:
      action = { type: input.type };
  }
  return payload(gameReducer(state, action), now);
}
