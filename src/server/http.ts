import "server-only";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { rateLimit } from "./rate-limit";
import { ConfigError } from "./env";
import { randomId } from "@/lib/utils/random";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json<T>(data: T, init?: number | ResponseInit) {
  const res = NextResponse.json(data, typeof init === "number" ? { status: init } : init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > 8_192) throw new ApiError(413, "too_large", "Request body too large");
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ApiError(400, "invalid_input", parsed.error.issues[0]?.message ?? "Invalid input");
  return parsed.data;
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function limit(req: Request, bucket: string, max: number, windowMs = 60_000) {
  if (!rateLimit(`${bucket}:${clientIp(req)}`, max, windowMs)) {
    throw new ApiError(429, "rate_limited", "Too many requests. Please slow down.");
  }
}

function requestIdOf(args: unknown[]): string {
  const req = args[0] instanceof Request ? args[0] : null;
  // Vercel's request id matches its runtime logs; fall back to our own.
  return req?.headers.get("x-vercel-id")?.split("::").pop() ?? randomId(6);
}

function routeOf(args: unknown[]): string {
  const req = args[0] instanceof Request ? args[0] : null;
  if (!req) return "?";
  try {
    return `${req.method} ${new URL(req.url).pathname}`;
  } catch {
    return req.method;
  }
}

/**
 * Wrap a route handler. Every failure becomes a typed JSON error with a
 * request id the player can report; configuration problems are 503s with an
 * honest message; unexpected exceptions are logged in full server-side and
 * never leak internals to the browser.
 */
/**
 * Defence in depth against cross-site requests (on top of SameSite=Lax
 * cookies): a browser-sent Origin on a state-changing request must match the
 * host. Requests without an Origin header (same-origin GETs, server tools)
 * are unaffected.
 */
function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "bad_origin", "Request blocked: unexpected origin.");
  }
  if (host && originHost !== host) throw new ApiError(403, "bad_origin", "Request blocked: unexpected origin.");
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      if (args[0] instanceof Request) assertSameOrigin(args[0]);
      return await fn(...args);
    } catch (err) {
      unstable_rethrow(err); // let Next.js internals (e.g. prerender bail-outs) through
      const requestId = requestIdOf(args);
      if (err instanceof ApiError) return json({ error: { code: err.code, message: err.message, requestId } }, err.status);
      if (err instanceof ConfigError) {
        console.error(`[api] config error ${err.code} on ${routeOf(args)} (req ${requestId}): ${err.operatorHint}`);
        return json({ error: { code: err.code, message: err.userMessage, requestId } }, { status: 503, headers: { "Retry-After": "60" } });
      }
      console.error(`[api] unexpected error on ${routeOf(args)} (req ${requestId})`, err);
      return json(
        { error: { code: "internal", message: "The game server hit an unexpected problem. Please try again in a moment.", requestId } },
        500,
      );
    }
  };
}
