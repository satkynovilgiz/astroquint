import { seededRandom, shuffle } from "@/lib/utils/random";
import type { Answer, PublicQuestion, Question, Reveal } from "./types";

/**
 * Presentation is deterministic per (seed, question): option order, statement
 * order and the initial timeline shuffle are derived from the seed, so the
 * server can re-derive exactly what a player saw without storing it.
 */

function permutation(n: number, seed: string, q: Question): number[] {
  return shuffle(
    Array.from({ length: n }, (_, i) => i),
    seededRandom(`${seed}:${q.id}`),
  );
}

function timelineOrder(q: Extract<Question, { world: "timeline" }>, seed: string): string[] {
  const ids = q.events.map((e) => e.id);
  const sorted = correctTimeline(q);
  let order = shuffle(ids, seededRandom(`${seed}:${q.id}`));
  // Never present an already-solved puzzle.
  if (order.every((id, i) => id === sorted[i])) order = [...order.slice(1), order[0]];
  return order;
}

function correctTimeline(q: Extract<Question, { world: "timeline" }>): string[] {
  return [...q.events].sort((a, b) => a.year - b.year).map((e) => e.id);
}

export function presentQuestion(q: Question, seed: string): PublicQuestion {
  switch (q.world) {
    case "pattern-break": {
      const p = permutation(q.options.length, seed, q);
      return { world: q.world, id: q.id, prompt: q.prompt, sequence: q.sequence, options: p.map((i) => q.options[i]) };
    }
    case "final-bet": {
      const p = permutation(q.options.length, seed, q);
      return { world: q.world, id: q.id, prompt: q.prompt, options: p.map((i) => q.options[i]) };
    }
    case "truth-trap": {
      const p = permutation(q.statements.length, seed, q);
      return { world: q.world, id: q.id, topic: q.topic, statements: p.map((i) => q.statements[i].text) };
    }
    case "timeline": {
      const byId = new Map(q.events.map((e) => [e.id, e]));
      return {
        world: q.world,
        id: q.id,
        prompt: q.prompt,
        events: timelineOrder(q, seed).map((id) => ({ id, label: byId.get(id)!.label })),
      };
    }
    case "geotap":
      return { world: q.world, id: q.id, prompt: q.prompt };
  }
}

/** The reveal for a question, independent of what (if anything) was answered. */
export function revealFor(q: Question, seed: string, correct = false): Reveal {
  const base = { correct, explanation: q.explanation, sources: q.sources };
  switch (q.world) {
    case "pattern-break":
    case "final-bet": {
      const p = permutation(q.options.length, seed, q);
      return { ...base, correctAnswer: { kind: "choice", index: p.indexOf(q.answer) } };
    }
    case "truth-trap": {
      const p = permutation(q.statements.length, seed, q);
      const presented = p.map((i) => q.statements[i]);
      return {
        ...base,
        correctAnswer: { kind: "choice", index: presented.findIndex((s) => !s.isTrue) },
        statements: presented.map(({ isTrue, note, source }) => ({ isTrue, note, source })),
        sources: [],
      };
    }
    case "timeline": {
      const ordered = [...q.events].sort((a, b) => a.year - b.year);
      return {
        ...base,
        correctAnswer: { kind: "order", ids: ordered.map((e) => e.id) },
        timeline: ordered.map(({ id, label, dateLabel }) => ({ id, label, dateLabel })),
        sources: ordered.map((e) => e.source),
      };
    }
    case "geotap":
      return { ...base, correctAnswer: { kind: "country", id: q.countryId }, country: { id: q.countryId, name: q.countryName } };
  }
}

export type Evaluation = { valid: false } | { valid: true; correct: boolean; reveal: Reveal };

/** Validate the shape of an answer for this question and check it. */
export function evaluateAnswer(q: Question, seed: string, answer: Answer): Evaluation {
  const expected = revealFor(q, seed).correctAnswer;
  let correct: boolean;
  switch (q.world) {
    case "pattern-break":
    case "final-bet":
    case "truth-trap": {
      const n = q.world === "truth-trap" ? q.statements.length : q.options.length;
      if (answer.kind !== "choice" || !Number.isInteger(answer.index) || answer.index < 0 || answer.index >= n) return { valid: false };
      correct = expected.kind === "choice" && answer.index === expected.index;
      break;
    }
    case "timeline": {
      const ids = q.events.map((e) => e.id);
      if (answer.kind !== "order" || answer.ids.length !== ids.length || new Set(answer.ids).size !== ids.length || !answer.ids.every((id) => ids.includes(id))) {
        return { valid: false };
      }
      correct = expected.kind === "order" && expected.ids.every((id, i) => answer.ids[i] === id);
      break;
    }
    case "geotap": {
      if (answer.kind !== "country" || typeof answer.id !== "string" || answer.id.length === 0 || answer.id.length > 32) return { valid: false };
      correct = answer.id === q.countryId;
      break;
    }
  }
  return { valid: true, correct, reveal: revealFor(q, seed, correct) };
}
