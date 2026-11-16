import { hasSessionSecret, storageMode, supabaseServerConfig } from "@/server/env";
import { handle, json } from "@/server/http";

/**
 * Deployment self-check for operators and for the UI's honest status
 * messages. Reports which pieces are configured — never any secret values.
 */
export const GET = handle(async (req: Request) => {
  void req.headers; // request-time route
  const storage = storageMode();
  let database: "ok" | "unreachable" | "not_configured" = "not_configured";
  if (storage === "supabase") {
    const cfg = supabaseServerConfig()!;
    try {
      const res = await fetch(`${cfg.url}/rest/v1/achievements?select=id&limit=1`, {
        headers: { apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}` },
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });
      database = res.ok ? "ok" : "unreachable";
    } catch {
      database = "unreachable";
    }
  }
  const sessions = hasSessionSecret() || process.env.NODE_ENV !== "production";
  const modes = {
    solo: sessions,
    daily: sessions && (storage === "memory" || database === "ok"),
    party: sessions && (storage === "memory" || database === "ok"),
  };
  return json({
    ok: modes.solo && modes.daily && modes.party,
    modes,
    checks: {
      sessionSecret: hasSessionSecret() ? "set" : process.env.NODE_ENV === "production" ? "missing" : "dev-fallback",
      storage,
      database,
      realtime: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "sse",
    },
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  });
});
