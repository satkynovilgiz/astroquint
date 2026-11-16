import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { randomId } from "@/lib/utils/random";
import { sessionSecret } from "./env";

/**
 * Anonymous guest identity: a random player id in a signed, HttpOnly cookie.
 * No account needed. The signature stops players forging another player's id;
 * clearing cookies simply creates a new guest (see README limitations).
 */

const COOKIE = "aq_session";
const MAX_AGE = 60 * 60 * 24 * 365;

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function encodeSession(playerId: string): string {
  const payload = Buffer.from(JSON.stringify({ pid: playerId, v: 1 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { pid?: unknown };
    return typeof data.pid === "string" && /^[a-f0-9]{32}$/.test(data.pid) ? data.pid : null;
  } catch {
    return null;
  }
}

export async function currentPlayerId(): Promise<string | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

/** Returns the caller's player id, issuing a new guest session if needed. */
export async function ensurePlayerId(): Promise<{ playerId: string; created: boolean }> {
  const existing = await currentPlayerId();
  if (existing) return { playerId: existing, created: false };
  const playerId = randomId(16);
  const jar = await cookies();
  jar.set(COOKIE, encodeSession(playerId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return { playerId, created: true };
}
