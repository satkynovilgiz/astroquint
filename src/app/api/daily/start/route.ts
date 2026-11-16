import { z } from "zod";
import { ensurePlayerId } from "@/server/session";
import { startDaily } from "@/server/daily";
import { handle, json, parseBody } from "@/server/http";
import { limitShared } from "@/server/rate-limit-shared";

export const POST = handle(async (req: Request) => {
  await limitShared(req, "daily-start", 15, 60);
  const { practice } = await parseBody(req, z.object({ practice: z.boolean().default(false) }));
  const { playerId } = await ensurePlayerId();
  return json(await startDaily(playerId, practice));
});
