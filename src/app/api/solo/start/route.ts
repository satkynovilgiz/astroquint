import { z } from "zod";
import { startSolo } from "@/server/solo";
import { handle, json, limit, parseBody } from "@/server/http";

export const POST = handle(async (req: Request) => {
  limit(req, "solo-start", 30);
  const { relaxed, recent } = await parseBody(req, z.object({ relaxed: z.boolean().default(false), recent: z.array(z.string().regex(/^[a-z]{2}-\d{3}$/)).max(40).default([]) }));
  return json(startSolo(relaxed, recent));
});
