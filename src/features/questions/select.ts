import { WORLDS } from "@/features/worlds/worlds";
import { shuffle } from "@/lib/utils/random";
import { questionsForWorld } from "./bank";

/**
 * Pick one question per world, in world order. Recently seen questions are
 * avoided where the pool allows, so replays feel fresh.
 */
export function selectQuestions(rand: () => number, recent: ReadonlySet<string> = new Set()): string[] {
  return WORLDS.map((world) => {
    const pool = questionsForWorld(world.id);
    if (pool.length === 0) throw new Error(`No approved questions for ${world.id}`);
    const fresh = pool.filter((q) => !recent.has(q.id));
    const choices = fresh.length > 0 ? fresh : pool;
    return shuffle(choices, rand)[0].id;
  });
}
