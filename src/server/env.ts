import "server-only";
import { randomBytes } from "node:crypto";

/**
 * A deployment configuration problem (not a bug in a request). Surfaced to
 * players as an honest "not configured" message with HTTP 503, and logged
 * with enough detail for the operator — never including secret values.
 */
export class ConfigError extends Error {
  constructor(
    public code: "session_secret_missing" | "storage_not_configured",
    public userMessage: string,
    public operatorHint: string,
  ) {
    super(operatorHint);
  }
}

const g = globalThis as unknown as { __aqDevSecret?: string };

export function hasSessionSecret(): boolean {
  const s = process.env.SESSION_SECRET;
  return !!s && s.length >= 32;
}

/** HMAC secret for guest sessions and Solo tokens. Required in production. */
export function sessionSecret(): string {
  if (hasSessionSecret()) return process.env.SESSION_SECRET!;
  if (process.env.NODE_ENV === "production" && process.env.ASTROQUINT_ALLOW_EPHEMERAL_SECRET !== "1") {
    throw new ConfigError(
      "session_secret_missing",
      "The game server isn't fully set up yet, so games can't start right now. Please try again later.",
      "SESSION_SECRET is not set (or shorter than 32 characters). Add it in Vercel → Project → Settings → Environment Variables, then redeploy.",
    );
  }
  // Dev/test: a per-process secret. Sessions reset when the server restarts.
  g.__aqDevSecret ??= randomBytes(32).toString("hex");
  return g.__aqDevSecret;
}

export function supabaseServerConfig(): { url: string; serviceKey: string } | null {
  // Accept both our names and the ones the Vercel ⇄ Supabase integration injects.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url, serviceKey } : null;
}

/** True on serverless hosting, where in-process memory is not shared between requests. */
export function isServerless(): boolean {
  return process.env.VERCEL === "1" || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

export type StorageMode = "supabase" | "memory" | "not_configured";

/**
 * Where ranked/multiplayer data lives. In-memory storage is fine for local
 * development and single-process servers, but on serverless it silently loses
 * data between instances — so there we refuse it unless explicitly allowed.
 */
export function storageMode(): StorageMode {
  if (supabaseServerConfig()) return "supabase";
  if (isServerless() && process.env.ASTROQUINT_ALLOW_MEMORY_STORE !== "1") return "not_configured";
  return "memory";
}

export function storageNotConfigured(): ConfigError {
  return new ConfigError(
    "storage_not_configured",
    "This mode needs Astroquint's online database, which isn't connected yet. Solo Orbit works without it.",
    "No Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) on a serverless deployment. Connect Supabase and apply supabase/migrations/0001_init.sql.",
  );
}
