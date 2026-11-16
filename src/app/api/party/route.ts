import { z } from "zod";
import { displayNameSchema } from "@/lib/validation/game";
import { ensurePlayerId } from "@/server/session";
import { createRoom } from "@/server/party";
import { handle, json, parseBody } from "@/server/http";
import { limitShared } from "@/server/rate-limit-shared";

export const POST = handle(async (req: Request) => {
  await limitShared(req, "party-create", 10, 60);
  const { name } = await parseBody(req, z.object({ name: displayNameSchema }));
  const { playerId } = await ensurePlayerId();
  return json(await createRoom(playerId, name), 201);
});
