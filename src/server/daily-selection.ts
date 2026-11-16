import "server-only";
import { selectQuestions } from "@/features/questions/select";
import { seededRandom } from "@/lib/utils/random";

/** Deterministic per-UTC-day Daily Orbit selection (no storage needed). */
export function dailySelection(date: string): string[] {
  return selectQuestions(seededRandom(`astroquint-daily:${date}`));
}
