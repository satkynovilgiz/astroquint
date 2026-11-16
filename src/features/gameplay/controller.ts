import type { WorldId } from "@/features/worlds/worlds";
import type { Answer, PublicQuestion, Reveal } from "@/features/questions/types";
import type { RoundOutcome } from "@/features/scoring/scoring";
import type { GameSummary } from "./summary";
import type { Phase } from "./engine";

/**
 * The contract between game UIs and whatever runs the rules: the local engine
 * (Solo) or the server (Daily / Party). Screens only ever see this view model,
 * so the same components work for every mode.
 */
export interface RoundView {
  worldId: WorldId;
  outcome: RoundOutcome | null;
  points: number;
  wager: number | null;
  wagerDelta: number | null;
}

export interface GameView {
  phase: Phase;
  roundIndex: number;
  worldId: WorldId;
  /** Present while playing or revealed. */
  question: PublicQuestion | null;
  /** Deadline on the local clock (ms epoch), or null when untimed. */
  deadline: number | null;
  relaxed: boolean;
  score: number;
  rounds: RoundView[];
  reveal: Reveal | null;
  submitted: Answer | null;
  wager: number | null;
  summary: GameSummary | null;
  /** Per-round review for the results screen (complete phase only). */
  review: { worldId: WorldId; title: string; explanation: string; outcome: RoundOutcome | null }[] | null;
  /** A request is in flight (server-backed modes). */
  busy: boolean;
  error: string | null;
}

export interface GameActions {
  begin(): void;
  lockWager(wager: number): void;
  submit(answer: Answer): void;
  /** Called by the UI when the local deadline passes. */
  expire(): void;
  next(): void;
  arrive(): void;
}
