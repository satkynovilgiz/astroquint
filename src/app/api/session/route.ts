import { ensurePlayerId } from "@/server/session";
import { ensureProfile } from "@/server/profiles";
import { handle, json, limit } from "@/server/http";

/** Creates (or confirms) the caller's guest session. */
export const POST = handle(async (req: Request) => {
  limit(req, "session", 20);
  const { playerId } = await ensurePlayerId();
  const profile = await ensureProfile(playerId);
  return json({ displayName: profile.displayName });
});
