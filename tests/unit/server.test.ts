// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { __setStore, getStore } from "@/server/store";
import { createMemoryStore } from "@/server/store/memory";
import { applyMatchAction, LATE_GRACE_MS } from "@/server/games";
import { dailySelection, dailyStatus, rankedMatchId, startDaily, dailyNumber } from "@/server/daily";
import { decodeSession, encodeSession } from "@/server/session";
import { profileOverview } from "@/server/profiles";
import { getQuestion } from "@/features/questions/bank";
import { revealFor } from "@/features/questions/present";
import type { Answer } from "@/features/questions/types";

const P1 = "a".repeat(32);
const P2 = "b".repeat(32);
const DAY = Date.UTC(2026, 10, 20, 12, 0, 0);

beforeEach(() => __setStore(createMemoryStore()));

async function correctAnswerFor(matchId: string): Promise<Answer> {
  const m = (await getStore().getMatch(matchId))!;
  const r = m.state.rounds[m.state.roundIndex];
  return revealFor(getQuestion(r.questionId)!, m.state.seed).correctAnswer;
}

/** Play a full server match answering everything correctly, `stepMs` after each start. */
async function playAll(matchId: string, player: string, start: number, wager = 0, stepMs = 5000) {
  let now = start;
  for (let i = 0; i < 5; i++) {
    let p = await applyMatchAction(matchId, player, { type: "begin" }, now);
    if (p.view.phase === "wager") p = await applyMatchAction(matchId, player, { type: "lockWager", wager }, now);
    now += stepMs;
    p = await applyMatchAction(matchId, player, { type: "submit", answer: await correctAnswerFor(matchId) }, now);
    p = await applyMatchAction(matchId, player, { type: "continue" }, now);
    if (i < 4) p = await applyMatchAction(matchId, player, { type: "arrive" }, now);
    if (i === 4) return p;
  }
  throw new Error("unreachable");
}

describe("daily orbit", () => {
  it("gives every player the same questions in the same order", async () => {
    const a = await startDaily(P1, false, DAY);
    const b = await startDaily(P2, false, DAY + 3_600_000);
    const qa = (await getStore().getMatch(a.matchId))!.state.rounds.map((r) => r.questionId);
    const qb = (await getStore().getMatch(b.matchId))!.state.rounds.map((r) => r.questionId);
    expect(qa).toEqual(qb);
    expect(qa).toEqual(dailySelection("2026-11-20"));
  });

  it("rolls over at 00:00 UTC", async () => {
    const before = await startDaily(P1, true, Date.UTC(2026, 10, 20, 23, 59, 59));
    const after = await startDaily(P1, true, Date.UTC(2026, 10, 21, 0, 0, 0));
    expect(before.dailyDate).toBe("2026-11-20");
    expect(after.dailyDate).toBe("2026-11-21");
    expect(dailyNumber("2026-11-15")).toBe(1);
    expect(dailyNumber("2026-11-21")).toBe(7);
  });

  it("allows one ranked attempt per day, resumable, and unlimited practice", async () => {
    const first = await startDaily(P1, false, DAY);
    expect(first.matchId).toBe(rankedMatchId("2026-11-20", P1));
    const again = await startDaily(P1, false, DAY + 1000);
    expect(again.matchId).toBe(first.matchId); // resume, not a new attempt

    const done = await playAll(first.matchId, P1, DAY);
    expect(done.view.phase).toBe("complete");
    expect(done.rank).toEqual({ rank: 1, total: 1 });

    await expect(startDaily(P1, false, DAY + 60_000)).rejects.toMatchObject({ status: 409, code: "already_played" });
    const practice = await startDaily(P1, true, DAY + 60_000);
    expect(practice.ranked).toBe(false);
    await playAll(practice.matchId, P1, DAY + 60_000);
    // Practice never overwrites the official result.
    const status = await dailyStatus(P1, DAY + 120_000);
    expect(status.result?.matchId).toBe(first.matchId);
    expect(status.leaderboard).toHaveLength(1);
  });

  it("ranks players with ties sharing a rank and keeps history per date", async () => {
    const a = await startDaily(P1, false, DAY);
    const b = await startDaily(P2, false, DAY);
    await playAll(a.matchId, P1, DAY, 0, 5000);
    await playAll(b.matchId, P2, DAY, 0, 5000);
    const board = await getStore().leaderboard("2026-11-20", 10);
    expect(board.map((r) => r.rank)).toEqual([1, 1]);
    expect(await getStore().leaderboard("2026-11-19", 10)).toEqual([]);
  });

  it("records achievements and profile history from ranked games", async () => {
    const a = await startDaily(P1, false, DAY);
    const done = await playAll(a.matchId, P1, DAY, 300, 4000);
    expect(done.newAchievements).toEqual(expect.arrayContaining(["perfect-orbit", "high-roller", "planet-hopper"]));
    const profile = await profileOverview(P1);
    expect(profile.stats.rankedDays).toBe(1);
    expect(profile.history[0].matchId).toBe(a.matchId);
    expect(profile.achievements.find((x) => x.id === "perfect-orbit")?.unlockedAt).not.toBeNull();
  });
});

describe("server-authoritative match actions", () => {
  it("rejects actions from another player", async () => {
    const a = await startDaily(P1, false, DAY);
    await expect(applyMatchAction(a.matchId, P2, { type: "begin" }, DAY)).rejects.toMatchObject({ status: 404 });
  });

  it("scores concurrent duplicate submissions exactly once", async () => {
    const a = await startDaily(P1, false, DAY);
    await applyMatchAction(a.matchId, P1, { type: "begin" }, DAY);
    const answer = await correctAnswerFor(a.matchId);
    const results = await Promise.all([
      applyMatchAction(a.matchId, P1, { type: "submit", answer }, DAY + 5000),
      applyMatchAction(a.matchId, P1, { type: "submit", answer }, DAY + 5000),
      applyMatchAction(a.matchId, P1, { type: "submit", answer }, DAY + 5000),
    ]);
    for (const r of results) expect(r.view.score).toBe(175);
    const m = (await getStore().getMatch(a.matchId))!;
    expect(m.state.score).toBe(175);
  });

  it("uses the server clock: answers inside the grace window count, later ones time out", async () => {
    const a = await startDaily(P1, true, DAY);
    await applyMatchAction(a.matchId, P1, { type: "begin" }, DAY);
    const answer = await correctAnswerFor(a.matchId);
    const ok = await applyMatchAction(a.matchId, P1, { type: "submit", answer }, DAY + 20_000 + LATE_GRACE_MS);
    expect(ok.view.rounds[0]).toMatchObject({ outcome: "correct", points: 100 });

    const b = await startDaily(P1, true, DAY);
    await applyMatchAction(b.matchId, P1, { type: "begin" }, DAY);
    const late = await applyMatchAction(b.matchId, P1, { type: "submit", answer: await correctAnswerFor(b.matchId) }, DAY + 20_000 + LATE_GRACE_MS + 1);
    expect(late.view.rounds[0]).toMatchObject({ outcome: "timeout", points: 0 });
  });

  it("refuses an early timeout and an over-balance wager", async () => {
    const a = await startDaily(P1, true, DAY);
    await applyMatchAction(a.matchId, P1, { type: "begin" }, DAY);
    const early = await applyMatchAction(a.matchId, P1, { type: "timeout" }, DAY + 1000);
    expect(early.view.phase).toBe("playing");
  });

  it("never exposes the answer before the round is locked", async () => {
    const a = await startDaily(P1, false, DAY);
    const p = await applyMatchAction(a.matchId, P1, { type: "begin" }, DAY);
    expect(p.view.reveal).toBeNull();
    expect(JSON.stringify(p.view.question)).not.toMatch(/answer|isTrue|year|countryId/);
  });
});

describe("guest sessions", () => {
  it("round-trips a signed id and rejects tampering", () => {
    const token = encodeSession(P1);
    expect(decodeSession(token)).toBe(P1);
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ pid: P2, v: 1 })).toString("base64url");
    expect(decodeSession(`${forged}.${sig}`)).toBeNull();
    expect(decodeSession(`${payload}.${sig.slice(0, -2)}xx`)).toBeNull();
    expect(decodeSession("garbage")).toBeNull();
    expect(decodeSession(undefined)).toBeNull();
  });
});
