import { Crown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface LeaderRow {
  rank: number;
  displayName: string;
  score: number;
  correct: number;
  isYou: boolean;
}

export function LeaderboardTable({ rows, empty }: { rows: LeaderRow[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="panel rounded-2xl p-6 text-center text-fg-muted">{empty}</p>;
  }
  return (
    <ol className="panel divide-y divide-line overflow-hidden rounded-2xl" aria-label="Rankings">
      {rows.map((r, i) => (
        <li
          key={`${r.rank}-${i}`}
          className={cn("flex min-h-14 items-center gap-3 px-4 py-2.5", r.isYou && "bg-action/10")}
          aria-current={r.isYou ? "true" : undefined}
        >
          <span
            className={cn(
              "tabular grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-sm font-bold",
              r.rank === 1 ? "bg-w5 text-space" : r.rank === 2 ? "bg-[#D6DCEB] text-space" : r.rank === 3 ? "bg-solar text-space" : "bg-white/8 text-fg-muted",
            )}
          >
            {r.rank === 1 ? <Crown className="h-4 w-4" aria-label="1st" /> : r.rank}
          </span>
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate font-medium">{r.displayName}</span>
            {r.isYou && <span className="shrink-0 rounded-pill bg-action px-2 py-0.5 text-xs font-bold text-action-fg">You</span>}
          </span>
          <span className="hidden text-sm text-fg-muted sm:inline">{r.correct}/5</span>
          <span className="tabular w-16 text-right font-display text-lg font-bold">{r.score}</span>
        </li>
      ))}
    </ol>
  );
}
