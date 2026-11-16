import { describe, expect, it } from "vitest";
import { ALL_QUESTIONS, QUESTIONS, questionsForWorld } from "@/features/questions/bank";
import { questionSchema } from "@/features/questions/schema";
import { evaluateAnswer, presentQuestion, revealFor } from "@/features/questions/present";
import { selectQuestions } from "@/features/questions/select";
import { WORLDS } from "@/features/worlds/worlds";
import { seededRandom } from "@/lib/utils/random";
import worldMap from "@/features/geo/world-map.json";

describe("question bank", () => {
  it("has at least 50 approved questions", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(50);
  });

  it.each(ALL_QUESTIONS.map((q) => [q.id, q] as const))("%s matches the schema", (_id, q) => {
    const parsed = questionSchema.safeParse(q);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
  });

  it("has unique ids", () => {
    expect(new Set(ALL_QUESTIONS.map((q) => q.id)).size).toBe(ALL_QUESTIONS.length);
  });

  it("has playable questions for every world", () => {
    for (const w of WORLDS) expect(questionsForWorld(w.id).length).toBeGreaterThanOrEqual(5);
  });

  it("cites at least one https source for every factual question", () => {
    for (const q of QUESTIONS) {
      if (q.world === "pattern-break") continue;
      if (q.world === "truth-trap") {
        for (const s of q.statements) expect(s.source.url).toMatch(/^https:\/\//);
      } else if (q.world === "timeline") {
        for (const e of q.events) expect(e.source.url).toMatch(/^https:\/\//);
      } else if (q.world === "final-bet" && q.sources.length === 0) {
        // Pure arithmetic questions need no citation.
        expect(q.explanation).toMatch(/\d/);
      } else {
        expect(q.sources.length).toBeGreaterThan(0);
      }
    }
  });

  it("only targets GeoTap countries that exist on the map", () => {
    const ids = new Set(worldMap.countries.map((c) => c.id));
    for (const q of questionsForWorld("geotap")) {
      expect(ids.has(q.countryId), q.id).toBe(true);
      expect(worldMap.countries.find((c) => c.id === q.countryId)?.name).toBe(q.countryName);
    }
  });
});

describe("cross-world give-aways", () => {
  it("no Final Bet answer appears in another world's prompt, statements or explanations", () => {
    const others = QUESTIONS.filter((q) => q.world !== "final-bet")
      .map((q) => JSON.stringify(q).toLowerCase());
    for (const q of questionsForWorld("final-bet")) {
      const answer = q.options[q.answer].toLowerCase().replace(/[°]/g, "");
      // Numbers (years, counts) coincide innocently across topics; names/places don't.
      if (answer.length < 4 || /^[\d\s,.]+$/.test(answer)) continue;
      const leaks = others.filter((text) => text.includes(answer));
      expect(leaks, `${q.id} answer "${answer}" is revealed elsewhere`).toEqual([]);
    }
  });
});

describe("presentation & evaluation", () => {
  it("never leaks answers into the public question", () => {
    for (const q of QUESTIONS) {
      const pub = JSON.stringify(presentQuestion(q, "seed"));
      expect(pub).not.toMatch(/"answer"|"isTrue"|"year"|"countryId"|"countryName"/);
    }
  });

  it("presents deterministically per seed and accepts the revealed answer", () => {
    for (const q of QUESTIONS) {
      expect(presentQuestion(q, "a")).toEqual(presentQuestion(q, "a"));
      const reveal = revealFor(q, "a");
      const result = evaluateAnswer(q, "a", reveal.correctAnswer);
      expect(result).toMatchObject({ valid: true, correct: true });
    }
  });

  it("maps shuffled option indices back to the right answer", () => {
    const q = questionsForWorld("pattern-break").find((x) => x.id === "pb-001")!;
    const pub = presentQuestion(q, "xyz");
    if (pub.world !== "pattern-break") throw new Error();
    const index = pub.options.indexOf("30");
    expect(evaluateAnswer(q, "xyz", { kind: "choice", index })).toMatchObject({ correct: true });
    expect(evaluateAnswer(q, "xyz", { kind: "choice", index: (index + 1) % 4 })).toMatchObject({ correct: false });
  });

  it("never presents a timeline already in order", () => {
    for (const q of questionsForWorld("timeline")) {
      for (const seed of ["a", "b", "c", "d", "e", "f"]) {
        const pub = presentQuestion(q, seed);
        if (pub.world !== "timeline") throw new Error();
        const sorted = [...q.events].sort((a, b) => a.year - b.year).map((e) => e.id);
        expect(pub.events.map((e) => e.id)).not.toEqual(sorted);
      }
    }
  });

  it("rejects malformed answers", () => {
    const pb = questionsForWorld("pattern-break")[0];
    const tl = questionsForWorld("timeline")[0];
    const gt = questionsForWorld("geotap")[0];
    expect(evaluateAnswer(pb, "s", { kind: "choice", index: 7 }).valid).toBe(false);
    expect(evaluateAnswer(pb, "s", { kind: "country", id: "392" }).valid).toBe(false);
    expect(evaluateAnswer(tl, "s", { kind: "order", ids: ["a", "a", "b", "c"] }).valid).toBe(false);
    expect(evaluateAnswer(tl, "s", { kind: "order", ids: ["a", "b"] }).valid).toBe(false);
    expect(evaluateAnswer(gt, "s", { kind: "country", id: "" }).valid).toBe(false);
  });

  it("selects one question per world, avoiding recent ones", () => {
    const ids = selectQuestions(seededRandom("x"));
    expect(ids).toHaveLength(5);
    const recent = new Set(questionsForWorld("pattern-break").slice(0, -1).map((q) => q.id));
    const next = selectQuestions(seededRandom("y"), recent);
    expect(recent.has(next[0])).toBe(false);
  });
});
