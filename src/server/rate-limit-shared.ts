import "server-only";
import { createHash } from "node:crypto";
import { sessionSecret, supabaseServerConfig } from "./env";
import { ApiError } from "./http";
import { rateLimit } from "./rate-limit";

const g = globalThis as unknown as { __aqSharedLimitDisabledUntil?: number };

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** Salted hash so raw IP addresses are never stored. */
function ipKey(bucket: string, req: Request): string {
  return `${bucket}:${createHash("sha256").update(`${sessionSecret()}:${clientIp(req)}`).digest("hex").slice(0, 32)}`;
}

/**
 * Rate limit that holds across all serverless instances (Postgres-backed via
 * supabase/migrations/0002_rate_limits.sql). Falls back to the per-instance
 * limiter if the database or the function is unavailable, so a missing
 * migration never takes the game down.
 */
export async function limitShared(req: Request, bucket: string, max: number, windowSeconds: number): Promise<void> {
  // Cheap local guard first.
  if (!rateLimit(`${bucket}:${clientIp(req)}`, max, windowSeconds * 1000)) {
    throw new ApiError(429, "rate_limited", "Too many requests. Please slow down.");
  }
  const cfg = supabaseServerConfig();
  if (!cfg || (g.__aqSharedLimitDisabledUntil ?? 0) > Date.now()) return;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/astroquint_rate_limit`, {
      method: "POST",
      headers: { apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_key: ipKey(bucket, req), p_max: max, p_window_seconds: windowSeconds }),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) {
      // Function not deployed yet (or DB hiccup): use local limits for a while.
      if (res.status === 404) console.warn("[rate-limit] astroquint_rate_limit not found; apply migration 0002. Falling back to per-instance limits.");
      g.__aqSharedLimitDisabledUntil = Date.now() + 5 * 60_000;
      return;
    }
    if ((await res.json()) === false) throw new ApiError(429, "rate_limited", "Too many requests. Please slow down.");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    g.__aqSharedLimitDisabledUntil = Date.now() + 60_000;
  }
}
