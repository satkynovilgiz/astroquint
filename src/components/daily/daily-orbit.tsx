"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { CalendarClock, Dumbbell, Loader2, Play, Trophy } from "lucide-react";
import { api } from "@/lib/api/client";
import { describeError, type FriendlyError } from "@/lib/api/errors";
import { ErrorNotice } from "@/components/ui/error-notice";
import { RollingText } from "@/components/ui/rolling-text";
import { CountUp } from "@/components/game/count-up";
import { formatCountdown, msUntilNextUtcDay } from "@/features/daily/time";
import { useServerGame, type MatchPayload } from "@/features/gameplay/use-server-game";
import { getAchievement, type AchievementId } from "@/features/achievements/achievements";
import { useNow } from "@/hooks/use-now";
import { getWorld } from "@/features/worlds/worlds";
import { Planet } from "@/components/animations/planet";
import { Button, ButtonLink } from "@/components/ui/button";
import { GameScreen } from "@/components/game/game-screen";
import { LeaderboardTable, type LeaderRow } from "@/components/leaderboard/leaderboard-table";
import { riseIn, staggerChildren } from "@/lib/motion/tokens";

interface DailyStatus {
  date: string;
  number: number;
  result: { score: number; correct: number; matchId: string; rank: { rank: number; total: number } | null } | null;
  inProgressMatchId: string | null;
  leaderboard: LeaderRow[];
  storage: "memory" | "supabase";
}

export function DailyOrbit() {
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [loadError, setLoadError] = useState<FriendlyError | null>(null);
  const [reloading, setReloading] = useState(false);
  const [active, setActive] = useState<{ payload: MatchPayload; offset: number } | null>(null);
  const [starting, setStarting] = useState<"ranked" | "practice" | null>(null);
  const [startError, setStartError] = useState<FriendlyError | null>(null);

  const refresh = useCallback(async () => {
    setReloading(true);
    try {
      setStatus(await api<DailyStatus>("/api/daily"));
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, "daily"));
    } finally {
      setReloading(false);
    }
  }, []);

  useEffect(() => {
    api<DailyStatus>("/api/daily")
      .then(setStatus)
      .catch((err) => setLoadError(describeError(err, "daily")));
  }, []);

  const [lastPractice, setLastPractice] = useState(false);
  const start = async (practice: boolean) => {
    setLastPractice(practice);
    setStarting(practice ? "practice" : "ranked");
    setStartError(null);
    try {
      const sentAt = Date.now();
      const payload = await api<MatchPayload>("/api/daily/start", { body: { practice } });
      setActive({ payload, offset: payload.serverNow - (sentAt + Date.now()) / 2 });
    } catch (err) {
      setStartError(describeError(err, "daily-start"));
      void refresh();
    } finally {
      setStarting(null);
    }
  };

  const resume = async (matchId: string) => {
    setStarting("ranked");
    try {
      const sentAt = Date.now();
      const payload = await api<MatchPayload>(`/api/matches/${matchId}`);
      setActive({ payload, offset: payload.serverNow - (sentAt + Date.now()) / 2 });
    } catch (err) {
      setStartError(describeError(err, "daily-start"));
    } finally {
      setStarting(null);
    }
  };

  if (active) {
    return (
      <ActiveDaily
        key={active.payload.matchId}
        initial={active.payload}
        offset={active.offset}
        number={status?.number ?? 0}
        onExit={() => {
          setActive(null);
          window.scrollTo({ top: 0 });
          void refresh();
        }}
        onPractice={() => {
          setActive(null);
          void start(true);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-8">
      <DailyHeader number={status?.number} date={status?.date} />

      {loadError && (
        <ErrorNotice error={loadError} onRetry={() => void refresh()} retrying={reloading} className="mt-6">
          {loadError.kind === "storage" && (
            <p className="mt-2 text-sm">
              <Link href="/play/solo" className="font-medium text-action underline underline-offset-2">
                Play Solo Orbit instead
              </Link>
            </p>
          )}
        </ErrorNotice>
      )}

      {!status && !loadError && (
        <p className="mt-8 inline-flex items-center gap-2 text-fg-muted" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Contacting mission control…
        </p>
      )}

      {status && (
        <motion.div variants={staggerChildren(0.05)} initial="hidden" animate="visible" className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <motion.section variants={riseIn} className="panel rounded-[1.5rem] p-5 sm:p-6" aria-labelledby="today-title">
            <h2 id="today-title" className="font-display text-xl font-bold">
              Today&apos;s route
            </h2>
            <ol className="mt-4 grid grid-cols-5 gap-2" aria-label="Today's worlds">
              {(["pattern-break", "truth-trap", "timeline", "geotap", "final-bet"] as const).map((id, i) => {
                const w = getWorld(id);
                return (
                  <motion.li
                    key={id}
                    className="text-center"
                    initial={{ opacity: 0, y: 18, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 + i * 0.08 }}
                  >
                    <Planet palette={w.palette} surface={w.surface} spinSeconds={30} glow={0.6} />
                    <span className="mt-1 block text-[0.7rem] text-fg-muted">{w.name}</span>
                  </motion.li>
                );
              })}
            </ol>

            {status.result ? (
              <div className="mt-6 rounded-2xl border border-action/40 bg-action/10 p-4">
                <p className="hud-label text-action">Ranked result locked in</p>
                <p className="tabular mt-1 font-display text-4xl font-bold">
                  <CountUp to={status.result.score} />
                </p>
                <p className="text-sm text-fg-muted">
                  {status.result.correct}/5 correct
                  {status.result.rank ? ` · Rank #${status.result.rank.rank} of ${status.result.rank.total}` : ""}
                </p>
                <div className="mt-4 flex flex-col flex-wrap gap-2 sm:flex-row">
                  <ButtonLink href={`/results/${status.result.matchId}`} transitionTypes={["nav-forward"]} variant="secondary" icon={<Trophy className="h-4 w-4" aria-hidden="true" />}>
                    View result card
                  </ButtonLink>
                  <Button variant="ghost" onClick={() => void start(true)} disabled={starting !== null} icon={<Dumbbell className="h-4 w-4" aria-hidden="true" />}>
                    Practice run
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-fg-muted">
                  One ranked attempt per day. It counts as soon as you start, and you can resume if you leave. After that you can practise
                  as much as you like, but practice runs aren&apos;t ranked.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  {status.inProgressMatchId ? (
                    <Button size="lg" onClick={() => void resume(status.inProgressMatchId!)} disabled={starting !== null} icon={<Play className="h-5 w-5" aria-hidden="true" />}>
                      Resume ranked orbit
                    </Button>
                  ) : (
                    <Button size="lg" onClick={() => void start(false)} disabled={starting !== null} icon={starting === "ranked" ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}>
                      Play ranked orbit
                    </Button>
                  )}
                  <Button size="lg" variant="ghost" onClick={() => void start(true)} disabled={starting !== null} icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}>
                    Practice
                  </Button>
                </div>
              </div>
            )}
            {startError && <ErrorNotice error={startError} onRetry={() => void start(lastPractice)} retrying={starting !== null} className="mt-4" />}
          </motion.section>

          <motion.section variants={riseIn} aria-labelledby="board-title">
            <div className="mb-3 flex items-end justify-between">
              <h2 id="board-title" className="font-display text-xl font-bold">
                Today&apos;s leaderboard
              </h2>
              <Link href="/leaderboard" transitionTypes={["nav-forward"]} className="min-h-11 content-center text-sm text-action hover:underline">
                Full rankings →
              </Link>
            </div>
            <LeaderboardTable rows={status.leaderboard} empty="No ranked results yet today. Play now to set the first score." />
            {status.storage === "memory" && (
              <p className="mt-3 text-xs text-fg-muted">
                Local mode: results are stored in this server&apos;s memory and reset when it restarts. Connect Supabase to keep them permanently.
              </p>
            )}
          </motion.section>
        </motion.div>
      )}
    </div>
  );
}

function DailyHeader({ number, date }: { number?: number; date?: string }) {
  const now = useNow();
  return (
    <div>
      <p className="hud-label text-w5">Daily Orbit{number ? ` #${number}` : ""}</p>
      <h1 className="mt-2 font-display text-[clamp(2rem,6vw,3.25rem)] font-bold leading-none tracking-[-0.03em]">Same five worlds for everyone</h1>
      <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-fg-muted">
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
        {date ? new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }) : "Today"} (UTC)
        <span aria-hidden="true">·</span>
        New orbit in <RollingText className="tabular font-semibold text-fg" text={now === null ? "--:--:--" : formatCountdown(msUntilNextUtcDay(now))} />
      </p>
    </div>
  );
}

function ActiveDaily({
  initial,
  offset,
  number,
  onExit,
  onPractice,
}: {
  initial: MatchPayload;
  offset: number;
  number: number;
  onExit: () => void;
  onPractice: () => void;
}) {
  const { payload, view, actions } = useServerGame(initial, offset);
  const ranked = payload.ranked;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <GameScreen
        view={view}
        actions={actions}
        resultsTitle={`Daily Orbit #${number}${ranked ? "" : " · Practice"}`}
        resultsSubtitle={payload.dailyDate ?? undefined}
        shareUrl={ranked ? `${typeof window !== "undefined" ? window.location.origin : ""}/results/${payload.matchId}` : undefined}
        onPlayAgain={onPractice}
        playAgainLabel="Practice run"
        badge={
          <span className={`hud-label rounded-pill px-2.5 py-1 ${ranked ? "bg-w5 text-space" : "border border-line text-fg-muted"}`}>
            {ranked ? "Ranked" : "Practice"}
          </span>
        }
        resultsExtra={
          <div className="space-y-3">
            {ranked && payload.rank && (
              <div className="panel flex items-center gap-4 rounded-2xl p-4 text-lg">
                <motion.span
                  aria-hidden="true"
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-3xl"
                  style={{ background: payload.rank.rank <= 3 ? ["#F5C451", "#D6DCEB", "#E8995C"][payload.rank.rank - 1] : "var(--aq-surface-2)" }}
                  initial={{ scale: 0, rotate: -120 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 14, delay: 1.2 }}
                >
                  {payload.rank.rank <= 3 ? ["🥇", "🥈", "🥉"][payload.rank.rank - 1] : <Trophy className="h-6 w-6 text-w5" />}
                </motion.span>
                <p>
                  You placed <strong className="tabular">#{payload.rank.rank}</strong> of {payload.rank.total} on today&apos;s leaderboard so far.
                </p>
              </div>
            )}
            {!ranked && <p className="text-sm text-fg-muted">Practice runs aren&apos;t ranked, so this score won&apos;t affect your leaderboard result.</p>}
            {payload.newAchievements && payload.newAchievements.length > 0 && (
              <p className="panel rounded-2xl p-4">
                New on your profile:{" "}
                {payload.newAchievements.map((id) => getAchievement(id as AchievementId).name).join(", ")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={onExit}>
                Back to Daily Orbit
              </Button>
              <ButtonLink href="/leaderboard" transitionTypes={["nav-forward"]} variant="ghost">
                View leaderboard
              </ButtonLink>
            </div>
          </div>
        }
      />
    </div>
  );
}
