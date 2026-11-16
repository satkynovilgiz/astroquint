// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceRoom,
  createRoomState,
  INTRO_MS,
  MAX_PLAYERS,
  PRESENCE_TIMEOUT_MS,
  HOST_HANDOFF_MS,
  REVEAL_MS,
  reduceRoom,
  roomView,
  RoomError,
  TRAVEL_INTRO_MS,
  WAGER_MS,
  partyQuestionIds,
  type RoomState,
} from "@/features/party/engine";
import { getQuestion } from "@/features/questions/bank";
import { revealFor } from "@/features/questions/present";
import type { Answer } from "@/features/questions/types";
import { __setStore } from "@/server/store";
import { createMemoryStore } from "@/server/store/memory";
import { actInRoom, createRoom, generateRoomCode, readRoom } from "@/server/party";

const T0 = 1_800_000_000_000;
const pid = (n: number) => String(n).repeat(32).slice(0, 32).replace(/[^a-f0-9]/g, "a");
const HOST = "1".repeat(32);
const GUEST = "2".repeat(32);
const THIRD = "3".repeat(32);
const SEED = "TESTRM:seed";
const QIDS = partyQuestionIds(SEED);

function room(): RoomState {
  return createRoomState({ code: "TESTRM", hostPid: HOST, hostName: "Host", hostPublicId: "aaaa0001", now: T0 });
}

function joined(n = 2): RoomState {
  let s = room();
  const extra = [GUEST, THIRD];
  for (let i = 0; i < n - 1; i++) {
    s = reduceRoom(s, extra[i], { type: "join", name: `P${i + 2}`, publicId: `bbbb000${i + 2}` }, T0);
    s = reduceRoom(s, extra[i], { type: "ready", ready: true }, T0);
  }
  return s;
}

function right(s: RoomState): Answer {
  return revealFor(getQuestion(s.questionIds[s.roundIndex])!, s.seed).correctAnswer;
}
function wrong(s: RoomState): Answer {
  const a = right(s);
  if (a.kind === "choice") return { kind: "choice", index: a.index === 0 ? 1 : 0 };
  if (a.kind === "order") return { kind: "order", ids: [...a.ids].reverse() };
  return { kind: "country", id: a.id === "076" ? "032" : "076" };
}

describe("party room rules", () => {
  it("lets players join up to the limit and rejects the rest", () => {
    let s = room();
    for (let i = 2; i <= MAX_PLAYERS; i++) s = reduceRoom(s, pid(i), { type: "join", name: `P${i}`, publicId: `p${i}` }, T0);
    expect(s.players).toHaveLength(MAX_PLAYERS);
    expect(() => reduceRoom(s, "f".repeat(32), { type: "join", name: "Late", publicId: "late" }, T0)).toThrow(RoomError);
  });

  it("only the host can start, and only with enough ready players", () => {
    const solo = room();
    expect(() => reduceRoom(solo, HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0)).toThrow(/at least 2/);
    let s = reduceRoom(room(), GUEST, { type: "join", name: "Guest", publicId: "g" }, T0);
    expect(() => reduceRoom(s, HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0)).toThrow(/get ready/);
    s = reduceRoom(s, GUEST, { type: "ready", ready: true }, T0);
    expect(() => reduceRoom(s, GUEST, { type: "start", questionIds: QIDS, seed: SEED }, T0)).toThrow(/host/);
    s = reduceRoom(s, HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0);
    expect(s.phase).toBe("intro");
    expect(() => reduceRoom(s, THIRD, { type: "join", name: "Late", publicId: "l" }, T0)).toThrow(/already started/);
  });

  it("runs synchronized rounds on the server clock and reveals early when everyone answered", () => {
    let s = reduceRoom(joined(3), HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0);
    s = advanceRoom(s, T0 + INTRO_MS);
    expect(s.phase).toBe("playing");
    const start = s.phaseStartedAt;
    expect(start).toBe(T0 + INTRO_MS); // derived from the schedule, not from who polled first
    s = reduceRoom(s, HOST, { type: "answer", answer: right(s) }, start + 5_000);
    s = reduceRoom(s, GUEST, { type: "answer", answer: wrong(s) }, start + 2_000);
    expect(s.phase).toBe("playing");
    s = reduceRoom(s, THIRD, { type: "answer", answer: right(s) }, start + 10_000);
    expect(s.phase).toBe("reveal");
    const scores = Object.fromEntries(s.players.map((p) => [p.name, p.score]));
    expect(scores).toEqual({ Host: 175, P2: 0, P3: 150 });
  });

  it("rejects duplicate and invalid answers", () => {
    let s = reduceRoom(joined(2), HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0);
    s = advanceRoom(s, T0 + INTRO_MS);
    s = reduceRoom(s, HOST, { type: "answer", answer: right(s) }, T0 + INTRO_MS + 1000);
    expect(() => reduceRoom(s, HOST, { type: "answer", answer: right(s) }, T0 + INTRO_MS + 1100)).toThrow(/already answered/);
    expect(() => reduceRoom(s, GUEST, { type: "answer", answer: { kind: "choice", index: 42 } }, T0 + INTRO_MS + 1100)).toThrow(/isn't valid/);
  });

  it("times out silent players and walks through every world to a final ranking", () => {
    let s = reduceRoom(joined(2), HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0);
    let now = T0;
    // Both players stay connected (as their clients would, by polling).
    const beat = (st: RoomState, t: number) => reduceRoom(reduceRoom(st, HOST, { type: "heartbeat" }, t), GUEST, { type: "heartbeat" }, t);
    for (let round = 0; round < 5; round++) {
      now = s.phaseEndsAt!;
      s = beat(s, now);
      if (s.phase === "wager") {
        s = reduceRoom(s, HOST, { type: "wager", wager: Math.min(300, s.players[0].score) }, now);
        expect(() => reduceRoom(s, HOST, { type: "wager", wager: 0 }, now)).toThrow(/already locked/);
        expect(() => reduceRoom(s, GUEST, { type: "wager", wager: 9999 }, now)).toThrow();
        expect(s.phase).toBe("wager"); // still waiting on the guest
        s = reduceRoom(s, GUEST, { type: "wager", wager: 0 }, now);
        expect(s.phase).toBe("playing"); // everyone locked: question starts immediately
      }
      expect(s.phase).toBe("playing");
      // Host answers right; guest stays silent (keeps heartbeating) and times out.
      s = reduceRoom(s, HOST, { type: "answer", answer: right(s) }, now + 1_000);
      s = reduceRoom(s, GUEST, { type: "heartbeat" }, now + 1_000);
      now = s.phaseEndsAt!;
      s = beat(s, now);
      expect(s.phase).toBe("reveal");
      expect(s.answers[round][s.players[1].publicId].outcome).toBe("timeout");
      s = beat(s, now + REVEAL_MS);
    }
    expect(s.phase).toBe("complete");
    const view = roomView(s, GUEST, now + REVEAL_MS);
    expect(view.standings[0]).toMatchObject({ name: "Host", rank: 1 });
    expect(view.standings[1]).toMatchObject({ name: "P2", score: 0, rank: 2 });
    expect(s.players[0].score).toBeGreaterThan(800);
  });

  it("hands host to the next player when the host disconnects, and lets players reconnect", () => {
    let s = joined(3);
    const later = T0 + HOST_HANDOFF_MS + 1;
    s = reduceRoom(s, GUEST, { type: "heartbeat" }, later);
    expect(s.hostPid).toBe(GUEST);
    const view = roomView(s, HOST, later);
    expect(view.players.find((p) => p.name === "Host")?.connected).toBe(false);
    // The old host comes back with the same session: still a member, presence restored.
    s = reduceRoom(s, HOST, { type: "heartbeat" }, later + 10);
    expect(roomView(s, HOST, later + 10).players.find((p) => p.isYou)?.connected).toBe(true);
  });

  it("doesn't wait for disconnected players before revealing", () => {
    let s = reduceRoom(joined(3), HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0);
    s = advanceRoom(s, T0 + INTRO_MS);
    const late = T0 + INTRO_MS + PRESENCE_TIMEOUT_MS - 1;
    // THIRD went silent at T0; HOST and GUEST keep polling and answer.
    s = reduceRoom(s, GUEST, { type: "heartbeat" }, late - 1);
    s = reduceRoom(s, HOST, { type: "answer", answer: right(s) }, late);
    expect(s.phase).toBe("playing"); // still waiting on GUEST, who is connected
    s = reduceRoom(s, GUEST, { type: "answer", answer: right(s) }, T0 + INTRO_MS + PRESENCE_TIMEOUT_MS + 1);
    expect(s.phase).toBe("reveal");
  });

  it("host can skip reveal, kick in the lobby, and rematch resets scores", () => {
    let s = reduceRoom(joined(3), HOST, { type: "kick", publicId: "bbbb0003" }, T0);
    expect(s.players).toHaveLength(2);
    expect(() => reduceRoom(s, GUEST, { type: "kick", publicId: "aaaa0001" }, T0)).toThrow(/host/);
    s = reduceRoom(s, HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0);
    s = advanceRoom(s, T0 + INTRO_MS);
    s = reduceRoom(s, HOST, { type: "answer", answer: right(s) }, T0 + INTRO_MS + 100);
    s = reduceRoom(s, GUEST, { type: "answer", answer: right(s) }, T0 + INTRO_MS + 100);
    expect(s.phase).toBe("reveal");
    expect(() => reduceRoom(s, GUEST, { type: "next" }, T0 + INTRO_MS + 200)).toThrow(/host/);
    s = reduceRoom(s, HOST, { type: "next" }, T0 + INTRO_MS + 200);
    expect(s).toMatchObject({ phase: "intro", roundIndex: 1 });
    expect(s.phaseEndsAt).toBe(T0 + INTRO_MS + 200 + TRAVEL_INTRO_MS);
    // Fast-forward to the end.
    let now = T0 + INTRO_MS + 200;
    while (s.phase !== "complete") {
      now = (s.phaseEndsAt ?? now) + 1;
      s = advanceRoom(s, now);
    }
    s = reduceRoom(s, HOST, { type: "heartbeat" }, now); // host is still around
    expect(() => reduceRoom(s, GUEST, { type: "rematch", questionIds: QIDS, seed: SEED }, now)).toThrow(/host/);
    s = reduceRoom(s, HOST, { type: "rematch", questionIds: QIDS, seed: SEED }, now);
    expect(s.phase).toBe("lobby");
    expect(s.players.every((p) => p.score === 0)).toBe(true);
    expect(WAGER_MS).toBeGreaterThan(0);
  });

  it("never sends the answer or other players' private ids before reveal", () => {
    let s = reduceRoom(joined(2), HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0);
    s = advanceRoom(s, T0 + INTRO_MS);
    s = reduceRoom(s, HOST, { type: "answer", answer: right(s) }, T0 + INTRO_MS + 100);
    const view = roomView(s, GUEST, T0 + INTRO_MS + 200);
    const text = JSON.stringify(view);
    expect(view.reveal).toBeNull();
    expect(text).not.toContain(HOST);
    expect(text).not.toMatch(/"isTrue"|"countryId"|"year"/);
    expect(view.players.find((p) => p.name === "Host")).toMatchObject({ answered: true, round: null });
  });
});

describe("party server", () => {
  beforeEach(() => __setStore(createMemoryStore()));

  it("creates rooms with unambiguous codes and rejects unknown ones", async () => {
    expect(generateRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const v = await createRoom(HOST, "Host", T0);
    expect(v.you?.isHost).toBe(true);
    await expect(readRoom("ZZZZZZ", HOST, T0)).rejects.toMatchObject({ status: 404 });
  });

  it("serialises concurrent answers from many players without losing any", async () => {
    const v = await createRoom(HOST, "Host", T0);
    const players = [HOST, ...Array.from({ length: 7 }, (_, i) => String.fromCharCode(97 + i).repeat(32))];
    for (const p of players.slice(1)) {
      await actInRoom(v.code, p, { type: "join", name: "P", publicId: p.slice(0, 8) }, T0);
      await actInRoom(v.code, p, { type: "ready", ready: true }, T0);
    }
    await actInRoom(v.code, HOST, { type: "start", questionIds: QIDS, seed: SEED }, T0);
    const t = T0 + INTRO_MS + 1000;
    const state = (await readRoom(v.code, HOST, t)) as { question: { world: string } };
    expect(state.question).not.toBeNull();
    const q = getQuestion(QIDS[0])!;
    const ans = revealFor(q, SEED).correctAnswer;
    const results = await Promise.allSettled(players.map((p) => actInRoom(v.code, p, { type: "answer", answer: ans }, t)));
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    const after = await readRoom(v.code, HOST, t + 1);
    expect(after.phase).toBe("reveal");
    expect(after.players.every((p) => p.round?.outcome === "correct")).toBe(true);
  });

  it("refuses actions from non-members", async () => {
    const v = await createRoom(HOST, "Host", T0);
    await expect(actInRoom(v.code, GUEST, { type: "ready", ready: true }, T0)).rejects.toMatchObject({ status: 403, code: "not_member" });
  });
});
