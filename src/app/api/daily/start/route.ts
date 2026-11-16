import { z } from "zod";
import { ensurePlayerId } from "@/server/session";
import { startDaily } from "@/server/daily";
import { handle, json, limit, parseBody } from "@/server/http";

export const POST = handle(async (req: Request) => {
  limit(req, "daily-start", 15);
  const { practice } = await parseBody(req, z.object({ practice: z.boolean().default(false) }));
  const { playerId } = await ensurePlayerId();
  return json(await startDaily(playerId, practice));
});
