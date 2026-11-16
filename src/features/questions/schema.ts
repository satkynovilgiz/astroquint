import { z } from "zod";

const source = z.object({
  title: z.string().min(1),
  url: z.url().refine((u) => u.startsWith("https://"), "sources must use https"),
  publisher: z.string().optional(),
});
const review = z.object({ status: z.enum(["approved", "draft", "rejected"]), checkedOn: z.string().optional() });
const base = {
  id: z.string().regex(/^[a-z]{2}-\d{3}$/),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  explanation: z.string().min(10),
  sources: z.array(source),
  review,
};
const fourOptions = z
  .array(z.string().min(1))
  .length(4)
  .refine((o) => new Set(o).size === 4, "options must be unique");

export const patternSchema = z.object({
  ...base,
  world: z.literal("pattern-break"),
  prompt: z.string().min(3),
  sequence: z.array(z.string().min(1)).min(3),
  options: fourOptions,
  answer: z.number().int().min(0).max(3),
});

export const truthSchema = z
  .object({
    ...base,
    world: z.literal("truth-trap"),
    topic: z.string().min(2),
    statements: z
      .array(z.object({ text: z.string().min(8), isTrue: z.boolean(), note: z.string().min(8), source }))
      .length(3),
  })
  .refine((q) => q.statements.filter((s) => !s.isTrue).length === 1, "exactly one statement must be false");

export const timelineSchema = z
  .object({
    ...base,
    world: z.literal("timeline"),
    prompt: z.string().min(3),
    events: z
      .array(z.object({ id: z.string().min(1), label: z.string().min(3), year: z.number().int(), dateLabel: z.string().min(2), source }))
      .min(3)
      .max(5),
  })
  .refine((q) => new Set(q.events.map((e) => e.year)).size === q.events.length, "event years must be distinct")
  .refine((q) => new Set(q.events.map((e) => e.id)).size === q.events.length, "event ids must be unique");

export const geoSchema = z.object({
  ...base,
  world: z.literal("geotap"),
  prompt: z.string().min(3),
  countryId: z.string().min(1),
  countryName: z.string().min(2),
});

export const finalSchema = z.object({
  ...base,
  world: z.literal("final-bet"),
  prompt: z.string().min(5),
  options: fourOptions,
  answer: z.number().int().min(0).max(3),
  difficulty: z.literal(3),
});

export const questionSchema = z.union([patternSchema, truthSchema, timelineSchema, geoSchema, finalSchema]);
