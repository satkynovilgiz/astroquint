// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __setStore, getStore } from "@/server/store";
import { createMemoryStore } from "@/server/store/memory";
import { rankedMatchId, startDaily } from "@/server/daily";
import { handle, json } from "@/server/http";
import { limitShared } from "@/server/rate-limit-shared";
import { createGame } from "@/features/gameplay/engine";
import { dailySelection } from "@/server/daily-selection";

const P1 = "c".repeat(32);
const DAY = Date.UTC(2026, 10, 20, 12);

beforeEach(() => {
  __setStore(createMemoryStore());
  // The shared limiter remembers a failed DB call for a few minutes; reset it so tests are order-independent.
  (globalThis as unknown as { __aqSharedLimitDisabledUntil?: number }).__aqSharedLimitDisabledUntil = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ranked match ids", () => {
  it("are deterministic per player/day but never contain the player id", () => {
    const a = rankedMatchId("2026-11-20", P1);
    expect(a).toBe(rankedMatchId("2026-11-20", P1));
    expect(a).not.toContain(P1);
    expect(a).not.toBe(rankedMatchId("2026-11-21", P1));
    expect(a).toMatch(/^d-2026-11-20-[a-f0-9]{24}$/);
  });

  it("still resumes a ranked attempt stored under the legacy id format", async () => {
    const legacyId = `d-2026-11-20-${P1}`;
    const state = createGame({ id: legacyId, seed: "daily:2026-11-20", questionIds: dailySelection("2026-11-20"), now: DAY });
    await getStore().createMatch({ id: legacyId, mode: "daily", playerId: P1, dailyDate: "2026-11-20", ranked: true, state, version: 0, createdAt: DAY, completedAt: null });
    const resumed = await startDaily(P1, false, DAY + 1000);
    expect(resumed.matchId).toBe(legacyId);
  });
});

describe("cross-site request guard", () => {
  const route = handle(async (req: Request) => {
    void req;
    return json({ ok: true });
  });
  it("rejects a state-changing request from another origin", async () => {
    const res = await route(new Request("https://astroquint.vercel.app/api/party", { method: "POST", headers: { origin: "https://evil.example", host: "astroquint.vercel.app" } }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("bad_origin");
  });
  it("allows same-origin requests and requests without an Origin header", async () => {
    expect((await route(new Request("https://astroquint.vercel.app/api/party", { method: "POST", headers: { origin: "https://astroquint.vercel.app", host: "astroquint.vercel.app" } }))).status).toBe(200);
    expect((await route(new Request("https://astroquint.vercel.app/api/party", { method: "POST", headers: { host: "astroquint.vercel.app" } }))).status).toBe(200);
    expect((await route(new Request("https://astroquint.vercel.app/api/daily", { headers: { origin: "https://evil.example", host: "astroquint.vercel.app" } }))).status).toBe(200);
  });
});

describe("shared rate limiting", () => {
  const req = () => new Request("https://x/api/party", { method: "POST", headers: { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250)}` } });

  it("uses the database verdict when available and never sends the raw IP", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    const fetchMock = vi.fn().mockResolvedValue(new Response("false", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = new Request("https://x/api/party", { method: "POST", headers: { "x-forwarded-for": "198.51.100.7" } });
    await expect(limitShared(r, `t-${Math.random()}`, 10, 60)).rejects.toMatchObject({ status: 429 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(JSON.stringify(body)).not.toContain("198.51.100.7");
  });

  it("falls back gracefully when the migration isn't applied", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(limitShared(req(), `t-${Math.random()}`, 10, 60)).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
