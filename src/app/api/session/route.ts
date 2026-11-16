import { ensurePlayerId } from "@/server/session";
import { ensureProfile } from "@/server/profiles";
import { handle, json } from "@/server/http";
import { limitShared } from "@/server/rate-limit-shared";

/** Creates (or confirms) the caller's guest session. */
export const POST = handle(async (req: Request) => {
  await limitShared(req, "session", 20, 60);
  const { playerId } = await ensurePlayerId();
  const profile = await ensureProfile(playerId);
  return json({ displayName: profile.displayName });
});
