import { roomCodeSchema } from "@/lib/validation/game";
import { currentPlayerId } from "@/server/session";
import { readRoom } from "@/server/party";
import { ApiError, handle, json, limit } from "@/server/http";

export const GET = handle(async (req: Request, ctx: RouteContext<"/api/party/[code]">) => {
  limit(req, "party-read", 240);
  const { code } = await ctx.params;
  if (!roomCodeSchema.safeParse(code).success) throw new ApiError(404, "room_not_found", "That room doesn't exist or has expired.");
  return json(await readRoom(code, await currentPlayerId()));
});
