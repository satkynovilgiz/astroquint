import "server-only";
import { randomBytes } from "node:crypto";

const g = globalThis as unknown as { __aqDevSecret?: string };

/** HMAC secret for guest sessions. Required in production. */
export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.ASTROQUINT_ALLOW_EPHEMERAL_SECRET !== "1") {
    throw new Error("SESSION_SECRET (≥32 chars) must be set in production");
  }
  // Dev/test: a per-process secret. Sessions reset when the server restarts.
  g.__aqDevSecret ??= randomBytes(32).toString("hex");
  return g.__aqDevSecret;
}

export function supabaseServerConfig(): { url: string; serviceKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}
