import { z } from "zod";
import { displayNameSchema } from "@/lib/validation/game";
import { ensurePlayerId } from "@/server/session";
import { profileOverview, renameProfile } from "@/server/profiles";
import { handle, json, limit, parseBody } from "@/server/http";

export const GET = handle(async (req: Request) => {
  limit(req, "profile-read", 60);
  const { playerId } = await ensurePlayerId();
  return json(await profileOverview(playerId));
});

export const PATCH = handle(async (req: Request) => {
  limit(req, "profile-write", 10);
  const { displayName } = await parseBody(req, z.object({ displayName: displayNameSchema }));
  const { playerId } = await ensurePlayerId();
  const p = await renameProfile(playerId, displayName);
  return json({ displayName: p.displayName });
});
