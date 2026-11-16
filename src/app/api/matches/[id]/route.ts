import { currentPlayerId } from "@/server/session";
import { loadOwnedMatch, payloadFor } from "@/server/games";
import { ApiError, handle, json, limit } from "@/server/http";

export const GET = handle(async (req: Request, ctx: RouteContext<"/api/matches/[id]">) => {
  limit(req, "match-read", 120);
  const { id } = await ctx.params;
  const playerId = await currentPlayerId();
  if (!playerId) throw new ApiError(404, "not_found", "Match not found");
  return json(payloadFor(await loadOwnedMatch(id, playerId), Date.now()));
});
