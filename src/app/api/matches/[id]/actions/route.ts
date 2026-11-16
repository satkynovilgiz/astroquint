import { gameActionSchema } from "@/lib/validation/game";
import { currentPlayerId } from "@/server/session";
import { applyMatchAction } from "@/server/games";
import { ApiError, handle, json, limit, parseBody } from "@/server/http";

export const POST = handle(async (req: Request, ctx: RouteContext<"/api/matches/[id]/actions">) => {
  limit(req, "match-action", 120);
  const now = Date.now(); // stamp before any async work
  const { id } = await ctx.params;
  const action = await parseBody(req, gameActionSchema);
  const playerId = await currentPlayerId();
  if (!playerId) throw new ApiError(401, "no_session", "Session expired. Reload to continue as a guest.");
  return json(await applyMatchAction(id, playerId, action, now));
});
