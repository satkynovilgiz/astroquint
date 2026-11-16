// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applySolo, openSolo, startSolo } from "@/server/solo";
import { getQuestion } from "@/features/questions/bank";
import { revealFor } from "@/features/questions/present";

const T0 = Date.UTC(2026, 10, 20, 12);

function decode(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
}

describe("server-run solo", () => {
  it("never reveals the answer before the round is locked, then scores on the server clock", () => {
    let p = startSolo(false, [], T0);
    p = applySolo(p.token, { type: "begin" }, T0);
    expect(p.view.reveal).toBeNull();
    expect(JSON.stringify(p.view)).not.toMatch(/"isTrue"|"countryId"|"year"|"explanation"/);
    const state = decode(p.token);
    const answer = revealFor(getQuestion(state.rounds[0].questionId)!, state.seed).correctAnswer;
    p = applySolo(p.token, { type: "submit", answer }, T0 + 5000);
    expect(p.view.rounds[0]).toMatchObject({ outcome: "correct", points: 175 });
    expect(p.view.reveal?.correct).toBe(true);
  });

  it("rejects tampered and expired tokens", () => {
    const p = startSolo(false, [], T0);
    const [payload, sig] = p.token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...decode(p.token), score: 99999 })).toString("base64url");
    expect(() => openSolo(`${forged}.${sig}`, T0)).toThrow(/Invalid/);
    expect(() => openSolo(`${payload}.x${sig.slice(1)}`, T0)).toThrow(/Invalid/);
    expect(() => openSolo(p.token, T0 + 7 * 60 * 60 * 1000)).toThrow(/expired/);
  });

  it("avoids recently played questions and reports them when the run completes", () => {
    const first = startSolo(true, [], T0);
    const ids = decode(first.token).rounds.map((r: { questionId: string }) => r.questionId);
    const second = startSolo(true, ids, T0);
    const ids2 = decode(second.token).rounds.map((r: { questionId: string }) => r.questionId);
    expect(ids2.filter((id: string) => ids.includes(id))).toEqual([]);
    expect(first.playedIds).toBeNull();
  });
});
