import { z } from "zod";
import { displayNameSchema } from "@/lib/validation/game";
import { ensurePlayerId } from "@/server/session";
import { createRoom } from "@/server/party";
import { handle, json, limit, parseBody } from "@/server/http";

export const POST = handle(async (req: Request) => {
  limit(req, "party-create", 10);
  const { name } = await parseBody(req, z.object({ name: displayNameSchema }));
  const { playerId } = await ensurePlayerId();
  return json(await createRoom(playerId, name), 201);
});
