import { z } from "zod";

export const answerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), index: z.number().int().min(0).max(9) }),
  z.object({ kind: z.literal("order"), ids: z.array(z.string().min(1).max(16)).min(1).max(8) }),
  z.object({ kind: z.literal("country"), id: z.string().min(1).max(32) }),
]);

export const gameActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("begin") }),
  z.object({ type: z.literal("lockWager"), wager: z.number().int().min(0).max(300) }),
  z.object({ type: z.literal("submit"), answer: answerSchema }),
  z.object({ type: z.literal("timeout") }),
  z.object({ type: z.literal("continue") }),
  z.object({ type: z.literal("arrive") }),
]);

export type GameActionInput = z.infer<typeof gameActionSchema>;

/** Display names: 2–20 visible characters, letters/numbers/space/._- only. */
export const displayNameSchema = z
  .string()
  .transform((s) => s.normalize("NFKC").replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(2, "Use at least 2 characters")
      .max(20, "Use at most 20 characters")
      .regex(/^[\p{L}\p{N} ._-]+$/u, "Letters, numbers, spaces, dots, dashes and underscores only"),
  );

export const roomCodeSchema = z.string().regex(/^[A-HJ-NP-Z2-9]{6}$/, "Invalid room code");
