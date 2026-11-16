import { roomCodeSchema } from "@/lib/validation/game";
import { subscribeRoom } from "@/server/realtime";
import { ApiError, handle, limit } from "@/server/http";

/**
 * Server-Sent Events stream of "room changed" pings for single-server and
 * local deployments. Payloads are version numbers only.
 */
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/party/[code]/events">) => {
  limit(req, "party-events", 30);
  const { code } = await ctx.params;
  if (!roomCodeSchema.safeParse(code).success) throw new ApiError(404, "room_not_found", "Unknown room");

  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send(`retry: 3000\n\n`);
      const unsubscribe = subscribeRoom(code, (v) => send(`event: changed\ndata: ${v}\n\n`));
      const keepAlive = setInterval(() => send(`: ping\n\n`), 15_000);
      cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
