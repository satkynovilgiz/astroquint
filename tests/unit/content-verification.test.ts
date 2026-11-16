// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { QUESTIONS, questionsForWorld } from "@/features/questions/bank";

/**
 * content/verification.json is produced by `npm run verify:claims`, which checks each factual claim against the
 * text of its cited source. These tests make sure every factual question is covered by — and passes — that check,
 * and verify the pure-maths questions by computation instead.
 */
const reportPath = resolve(__dirname, "../../content/verification.json");

describe("question verification", () => {
  it("has a source-text verification report", () => {
    expect(existsSync(reportPath)).toBe(true);
  });

  const report = existsSync(reportPath)
    ? (JSON.parse(readFileSync(reportPath, "utf8")) as { questions: Record<string, { verified: boolean; claims: { claim: string; source: string }[] }> })
    : { questions: {} };

  it("every factual Timeline, GeoTap, Truth Trap and sourced Final Bet question is verified against its cited source", () => {
    const factual = QUESTIONS.filter((q) => q.world !== "pattern-break" && !(q.world === "final-bet" && q.sources.length === 0));
    const unverified = factual.filter((q) => !report.questions[q.id]?.verified).map((q) => q.id);
    expect(unverified, "run `npm run verify:claims` and fix or replace these").toEqual([]);
  });

  it("the report checks each question against its *current* cited sources", () => {
    for (const q of QUESTIONS) {
      const entry = report.questions[q.id];
      if (!entry) continue;
      const cited = new Set<string>([
        ...q.sources.map((s) => s.url),
        ...(q.world === "truth-trap" ? q.statements.map((s) => s.source.url) : []),
        ...(q.world === "timeline" ? q.events.map((e) => e.source.url) : []),
      ]);
      for (const c of entry.claims) expect(cited.has(c.source), `${q.id}: ${c.source} is no longer cited — re-run verify:claims`).toBe(true);
    }
  });

  it("pure-maths Final Bet answers are correct by computation", () => {
    const isPrime = (n: number) => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d !== 0);
    for (const q of questionsForWorld("final-bet").filter((x) => x.sources.length === 0)) {
      const answer = q.options[q.answer];
      if (/prime number greater than 100/.test(q.prompt)) {
        let n = 101;
        while (!isPrime(n)) n++;
        expect(answer).toBe(String(n));
      } else if (/interior angles of a hexagon/.test(q.prompt)) {
        expect(answer).toBe(`${(6 - 2) * 180}°`);
      } else {
        throw new Error(`${q.id} has no source and no computational check`);
      }
    }
  });

  it("Pattern Break answers follow from the stated rule (spot-checked by computation)", () => {
    const pb = Object.fromEntries(questionsForWorld("pattern-break").map((q) => [q.id, q]));
    const ans = (id: string) => pb[id].options[pb[id].answer];
    expect(ans("pb-001")).toBe(String(5 * 6)); // n(n+1)
    expect(ans("pb-002")).toBe(String(3 ** 5));
    expect(ans("pb-003")).toBe("13");
    expect(ans("pb-007")).toBe(String(1 * 2 * 3 * 4 * 5 * 6));
    expect(ans("pb-008")).toBe(String(26 * 2 - 2));
    expect(ans("pb-012")).toBe(String(37 + 15));
    expect(ans("pb-014")).toBe(String((6 * 7) / 2));
    expect(ans("pb-015")).toBe(String(47 * 2 + 1));
    expect(ans("pb-017")).toBe(String(2 ** 6 - 1));
    expect(ans("pb-018")).toBe(String(13.5 * 1.5));
  });
});
