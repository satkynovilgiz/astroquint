import { WORLDS } from "@/features/worlds/worlds";
import { shuffle } from "@/lib/utils/random";
import { questionsForWorld } from "./bank";

/**
 * Pick one question per world, in world order. Recently seen questions are
 * avoided where the pool allows, so replays feel fresh.
 */
export function selectQuestions(
  rand: () => number,
  recent: ReadonlySet<string> = new Set(),
  /** Never selected (e.g. today's ranked Daily questions), unless nothing else exists. */
  forbidden: ReadonlySet<string> = new Set(),
): string[] {
  return WORLDS.map((world) => {
    const all = questionsForWorld(world.id);
    if (all.length === 0) throw new Error(`No approved questions for ${world.id}`);
    const allowed = all.filter((q) => !forbidden.has(q.id));
    const pool = allowed.length > 0 ? allowed : all;
    const fresh = pool.filter((q) => !recent.has(q.id));
    const choices = fresh.length > 0 ? fresh : pool;
    return shuffle(choices, rand)[0].id;
  });
}
