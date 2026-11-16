import { currentPlayerId } from "@/server/session";
import { dailyStatus } from "@/server/daily";
import { handle, json, limit } from "@/server/http";

export const GET = handle(async (req: Request) => {
  limit(req, "daily-read", 120);
  return json(await dailyStatus(await currentPlayerId()));
});
