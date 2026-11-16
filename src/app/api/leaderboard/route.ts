import { utcDayKey } from "@/features/daily/time";
import { currentPlayerId } from "@/server/session";
import { dailyNumber, DAILY_EPOCH } from "@/server/daily";
import { getStore } from "@/server/store";
import { ApiError, handle, json, limit } from "@/server/http";

export const GET = handle(async (req: Request) => {
  limit(req, "leaderboard", 120);
  const url = new URL(req.url);
  const today = utcDayKey(Date.now());
  const date = url.searchParams.get("date") ?? today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || date > today || date < DAILY_EPOCH) {
    throw new ApiError(400, "invalid_date", "Choose a date between the first Daily Orbit and today");
  }
  const playerId = await currentPlayerId();
  const rows = await getStore().leaderboard(date, 50);
  const mine = playerId ? await getStore().getDailyResult(date, playerId) : null;
  const myRank = mine ? await getStore().rankFor(date, mine.score) : null;
  return json({
    date,
    today,
    number: dailyNumber(date),
    rows: rows.map((r) => ({ rank: r.rank, displayName: r.displayName, score: r.score, correct: r.correct, isYou: r.playerId === playerId })),
    you: mine && myRank ? { score: mine.score, rank: myRank.rank, total: myRank.total } : null,
  });
});
