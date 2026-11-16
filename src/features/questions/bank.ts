import patternBreak from "../../../content/questions/pattern-break.json";
import truthTrap from "../../../content/questions/truth-trap.json";
import timeline from "../../../content/questions/timeline.json";
import geotap from "../../../content/questions/geotap.json";
import finalBet from "../../../content/questions/final-bet.json";
import type { WorldId } from "@/features/worlds/worlds";
import type { Question, QuestionFor } from "./types";

/**
 * The question bank. Content lives in /content/questions/*.json so it can be
 * reviewed, versioned and imported into the database without touching UI
 * code. Every file is validated against ./schema.ts by the test suite.
 * Only `approved` questions are ever served.
 */
export const ALL_QUESTIONS = [
  ...patternBreak,
  ...truthTrap,
  ...timeline,
  ...geotap,
  ...finalBet,
] as unknown as readonly Question[];

export const QUESTIONS: readonly Question[] = ALL_QUESTIONS.filter((q) => q.review.status === "approved");

const byId = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): Question | undefined {
  return byId.get(id);
}

export function questionsForWorld<W extends WorldId>(world: W): QuestionFor<W>[] {
  return QUESTIONS.filter((q): q is QuestionFor<W> => q.world === world);
}
