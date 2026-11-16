import { z } from "zod";
import { answerSchema, displayNameSchema, roomCodeSchema } from "@/lib/validation/game";
import { randomId } from "@/lib/utils/random";
import { ensurePlayerId } from "@/server/session";
import { actInRoom, newMatchSeed } from "@/server/party";
import { ApiError, handle, json, limit, parseBody } from "@/server/http";
import type { RoomAction } from "@/features/party/engine";

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("join"), name: displayNameSchema }),
  z.object({ type: z.literal("leave") }),
  z.object({ type: z.literal("ready"), ready: z.boolean() }),
  z.object({ type: z.literal("start") }),
  z.object({ type: z.literal("wager"), wager: z.number().int().min(0).max(300) }),
  z.object({ type: z.literal("answer"), answer: answerSchema }),
  z.object({ type: z.literal("next") }),
  z.object({ type: z.literal("kick"), playerId: z.string().regex(/^[a-f0-9]{8}$/) }),
  z.object({ type: z.literal("rematch") }),
  z.object({ type: z.literal("heartbeat") }),
]);

export const POST = handle(async (req: Request, ctx: RouteContext<"/api/party/[code]/actions">) => {
  limit(req, "party-action", 240);
  const now = Date.now();
  const { code } = await ctx.params;
  if (!roomCodeSchema.safeParse(code).success) throw new ApiError(404, "room_not_found", "That room doesn't exist or has expired.");
  const body = await parseBody(req, bodySchema);
  const { playerId } = await ensurePlayerId();

  let action: RoomAction;
  switch (body.type) {
    case "join":
      action = { type: "join", name: body.name, publicId: randomId(4) };
      break;
    case "start":
    case "rematch":
      action = { type: body.type, ...newMatchSeed(code) };
      break;
    case "kick":
      action = { type: "kick", publicId: body.playerId };
      break;
    default:
      action = body;
  }
  return json(await actInRoom(code, playerId, action, now));
});
