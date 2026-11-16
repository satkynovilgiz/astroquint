// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigError, sessionSecret, storageMode } from "@/server/env";
import { handle } from "@/server/http";
import { __setStore, getStore } from "@/server/store";
import { startSolo } from "@/server/solo";
import { dailySelection } from "@/server/daily-selection";
import { newMatchSeed } from "@/server/party";
import { utcDayKey } from "@/features/daily/time";
import { describeError } from "@/lib/api/errors";
import { ApiRequestError } from "@/lib/api/client";

afterEach(() => {
  vi.unstubAllEnvs();
  __setStore(undefined as never);
});

function decode(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
}

describe("production configuration (regression: 'Something went wrong' on Vercel)", () => {
  it("a missing SESSION_SECRET in production is a typed ConfigError, not a generic crash", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => sessionSecret()).toThrow(ConfigError);
    try {
      sessionSecret();
    } catch (e) {
      expect((e as ConfigError).code).toBe("session_secret_missing");
      expect((e as ConfigError).userMessage).not.toMatch(/SESSION_SECRET/); // no internals to players
    }
  });

  it("the API answers 503 with an honest message and a request id", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = handle(async (req: Request) => {
      void req;
      sessionSecret();
      return new Response("unreachable");
    });
    const res = await route(new Request("https://x/api/solo/start", { method: "POST", headers: { "x-vercel-id": "sfo1::abc123" } }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatchObject({ code: "session_secret_missing", requestId: "abc123" });
    expect(body.error.message).not.toBe("Something went wrong");
    // The operator gets the actionable detail in the server log.
    expect(spy.mock.calls.flat().join(" ")).toMatch(/SESSION_SECRET is not set/);
    spy.mockRestore();
  });

  it("unexpected exceptions are logged and return a specific, non-leaky 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = handle(async (req: Request) => {
      void req;
      throw new Error("db password is hunter2");
    });
    const res = await route(new Request("https://x/api/daily"));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error.code).toBe("internal");
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(body.error.requestId).toBeTruthy();
    spy.mockRestore();
  });

  it("refuses the per-instance memory store on serverless unless Supabase is configured", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(storageMode()).toBe("not_configured");
    expect(() => getStore()).toThrow(expect.objectContaining({ code: "storage_not_configured" }));
    vi.stubEnv("ASTROQUINT_ALLOW_MEMORY_STORE", "1");
    expect(storageMode()).toBe("memory");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    expect(storageMode()).toBe("supabase");
  });

  it("Solo works on serverless without any database", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => startSolo(false, [])).not.toThrow();
  });
});

describe("ranked integrity", () => {
  it("never puts today's Daily questions into Solo or Party", () => {
    const now = Date.UTC(2026, 10, 20, 12);
    const daily = new Set(dailySelection(utcDayKey(now)));
    for (let i = 0; i < 40; i++) {
      const solo = decode(startSolo(false, [], now).token).rounds.map((r: { questionId: string }) => r.questionId);
      expect(solo.filter((id: string) => daily.has(id))).toEqual([]);
      const party = newMatchSeed("ABCDEF", now).questionIds;
      expect(party.filter((id) => daily.has(id))).toEqual([]);
    }
  });
});

describe("player-facing error descriptions", () => {
  it("matches messages to the detected condition", () => {
    expect(describeError(new ApiRequestError(0, "network", "x"), "party-create").message).toBe("Could not create a room. Check your connection and try again.");
    expect(describeError(new ApiRequestError(503, "storage_not_configured", "needs db"), "daily")).toMatchObject({ kind: "storage", retryable: false });
    expect(describeError(new ApiRequestError(503, "session_secret_missing", "setup"), "solo-start")).toMatchObject({ kind: "config", retryable: true });
    expect(describeError(new ApiRequestError(500, "internal", "x", "req1"), "solo-start")).toMatchObject({ message: "Unable to start your game. Please try again.", requestId: "req1" });
    expect(describeError(new ApiRequestError(429, "rate_limited", "x"), "game-action").kind).toBe("rate");
    expect(describeError(new ApiRequestError(409, "already_played", "Already played today."), "daily-start").message).toBe("Already played today.");
  });
});
