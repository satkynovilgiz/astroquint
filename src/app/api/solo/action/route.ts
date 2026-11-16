import { z } from "zod";
import { gameActionSchema } from "@/lib/validation/game";
import { applySolo } from "@/server/solo";
import { handle, json, limit, parseBody } from "@/server/http";

export const POST = handle(async (req: Request) => {
  limit(req, "solo-action", 240);
  const now = Date.now();
  const { token, action } = await parseBody(req, z.object({ token: z.string().min(10).max(16_000), action: gameActionSchema }));
  return json(applySolo(token, action, now));
});
