import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Check, X } from "lucide-react";
import { WORLDS } from "@/features/worlds/worlds";
import { summarize } from "@/features/gameplay/summary";
import { getAchievement } from "@/features/achievements/achievements";
import { getStore } from "@/server/store";
import { dailyNumber } from "@/server/daily";
import { Planet } from "@/components/animations/planet";
import { ButtonLink } from "@/components/ui/button";
import { PageTransition } from "@/components/layout/page-transition";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Result", description: "An Astroquint result card.", robots: { index: false } };

/**
 * Public, spoiler-free result card for a finished server-recorded match:
 * scores and outcomes only — never question content, so sharing a Daily
 * result can't leak today's answers.
 */
export default function ResultPage({ params }: PageProps<"/results/[matchId]">) {
  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 sm:pt-10">
        <Suspense fallback={<p className="text-fg-muted" role="status">Loading result…</p>}>
          <ResultCard params={params} />
        </Suspense>
      </div>
    </PageTransition>
  );
}

async function ResultCard({ params }: { params: PageProps<"/results/[matchId]">["params"] }) {
  const { matchId } = await params;
  if (!/^[a-z0-9-]{4,80}$/.test(matchId)) notFound();
  const store = getStore();
  const match = await store.getMatch(matchId);
  if (!match || match.completedAt === null) notFound();
  const owner = await store.getProfile(match.playerId);
  const summary = summarize(match.state.rounds, match.state.score, match.state.relaxed);
  const rank = match.ranked && match.dailyDate ? await store.rankFor(match.dailyDate, match.state.score) : null;
  const title = match.dailyDate ? `Daily Orbit #${dailyNumber(match.dailyDate)}${match.ranked ? "" : " · Practice"}` : "Astroquint";

  return (
    <article className="panel rounded-[1.75rem] p-6 text-center sm:p-8" aria-labelledby="result-title">
      <p className="hud-label text-brand-soft">{title}</p>
      <h1 id="result-title" className="mt-2 font-display text-2xl font-bold">
        {owner?.displayName ?? "A pilot"} scored
      </h1>
      <p className="tabular mt-2 font-display text-7xl font-bold text-action">{match.state.score}</p>
      <p className="text-fg-muted">
        {summary.correct} of 5 worlds conquered{rank ? ` · rank #${rank.rank} of ${rank.total}` : ""}
        {match.dailyDate ? ` · ${match.dailyDate}` : ""}
      </p>
      <ol className="mx-auto mt-6 flex max-w-sm justify-center gap-3" aria-label="Results by world">
        {summary.perWorld.map((r) => {
          const w = WORLDS.find((x) => x.id === r.worldId)!;
          const ok = r.outcome === "correct";
          return (
            <li key={r.worldId} className="relative w-12">
              <Planet palette={w.palette} surface={w.surface} spinSeconds={0} glow={ok ? 0.8 : 0.1} className={cn(!ok && "opacity-45 grayscale")} />
              <span className={cn("absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full", ok ? "bg-action text-action-fg" : "bg-danger text-space")}>
                {ok ? <Check className="h-3 w-3" strokeWidth={4} aria-hidden="true" /> : <X className="h-3 w-3" strokeWidth={4} aria-hidden="true" />}
              </span>
              <span className="sr-only">
                {w.name}: {ok ? "correct" : "missed"}
              </span>
            </li>
          );
        })}
      </ol>
      {summary.achievements.length > 0 && (
        <p className="mt-5 text-sm text-fg-muted">Achievements: {summary.achievements.map((a) => `${getAchievement(a).glyph} ${getAchievement(a).name}`).join(" · ")}</p>
      )}
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/daily" transitionTypes={["nav-forward"]}>
          Play today&apos;s Daily Orbit
        </ButtonLink>
        <ButtonLink href="/play" transitionTypes={["nav-forward"]} variant="secondary">
          All modes
        </ButtonLink>
      </div>
    </article>
  );
}
