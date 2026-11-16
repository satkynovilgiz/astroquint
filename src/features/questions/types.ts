import type { WorldId } from "@/features/worlds/worlds";

export interface Source {
  title: string;
  url: string;
  publisher?: string;
}

export interface Review {
  status: "approved" | "draft" | "rejected";
  checkedOn?: string;
}

interface Base<W extends WorldId> {
  id: string;
  world: W;
  difficulty: 1 | 2 | 3;
  explanation: string;
  sources: Source[];
  review: Review;
}

export interface PatternQuestion extends Base<"pattern-break"> {
  prompt: string;
  sequence: string[];
  options: string[];
  answer: number;
}

export interface TruthStatement {
  text: string;
  isTrue: boolean;
  note: string;
  source: Source;
}

export interface TruthQuestion extends Base<"truth-trap"> {
  topic: string;
  statements: TruthStatement[];
}

export interface TimelineEvent {
  id: string;
  label: string;
  /** Astronomical-ish year for sorting; negative = BC. */
  year: number;
  dateLabel: string;
  source: Source;
}

export interface TimelineQuestion extends Base<"timeline"> {
  prompt: string;
  events: TimelineEvent[];
}

export interface GeoQuestion extends Base<"geotap"> {
  prompt: string;
  /** ISO 3166-1 numeric code, as used by the Natural Earth map data. */
  countryId: string;
  countryName: string;
}

export interface FinalQuestion extends Base<"final-bet"> {
  prompt: string;
  options: string[];
  answer: number;
}

export type Question = PatternQuestion | TruthQuestion | TimelineQuestion | GeoQuestion | FinalQuestion;
export type QuestionFor<W extends WorldId> = Extract<Question, { world: W }>;

/** What a player can submit. */
export type Answer =
  | { kind: "choice"; index: number }
  | { kind: "order"; ids: string[] }
  | { kind: "country"; id: string };

/** Question as shown to the player — never contains the solution. */
export type PublicQuestion =
  | { world: "pattern-break"; id: string; prompt: string; sequence: string[]; options: string[] }
  | { world: "truth-trap"; id: string; topic: string; statements: string[] }
  | { world: "timeline"; id: string; prompt: string; events: { id: string; label: string }[] }
  | { world: "geotap"; id: string; prompt: string }
  | { world: "final-bet"; id: string; prompt: string; options: string[] };

export type PublicQuestionFor<W extends WorldId> = Extract<PublicQuestion, { world: W }>;

/** Revealed after the round is locked. Indices refer to the presented order. */
export interface Reveal {
  correct: boolean;
  correctAnswer: Answer;
  explanation: string;
  sources: Source[];
  statements?: { isTrue: boolean; note: string; source: Source }[];
  timeline?: { id: string; label: string; dateLabel: string }[];
  country?: { id: string; name: string };
}
