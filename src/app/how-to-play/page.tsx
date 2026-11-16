import type { Metadata } from "next";
import { CalendarClock, Gauge, Timer, Users, User, Coins } from "lucide-react";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { Planet } from "@/components/animations/planet";
import { Card } from "@/components/ui/card";
import { WORLDS, type WorldId } from "@/features/worlds/worlds";
import { BASE_POINTS, MAX_SPEED_BONUS, MAX_WAGER } from "@/features/scoring/scoring";

export const metadata: Metadata = {
  title: "How to Play",
  description: "The five Astroquint worlds, how scoring works, and the Solo, Daily and Party modes.",
};

const HOW: Record<WorldId, string[]> = {
  "pattern-break": [
    "You'll see a sequence of numbers, shapes or a logical arrangement.",
    "Pick the one of four answers that continues the pattern.",
    "After you answer, a short explanation shows the rule.",
  ],
  "truth-trap": [
    "Three statements appear. Two are true and exactly one is false.",
    "Tap the false one.",
    "The reveal explains each fact and where it comes from.",
  ],
  timeline: [
    "Several events arrive shuffled.",
    "Put them in order from earliest to latest by dragging, using the move buttons, or with the keyboard.",
    "Submit when you're happy. Only a fully correct order scores.",
  ],
  geotap: [
    "Read the clue, for example “Find Japan”.",
    "Tap the country on the map. You can zoom, and there's a searchable list if the map is hard to use.",
    "You get 25 seconds here because maps take longer to scan.",
  ],
  "final-bet": [
    `Before the question, choose a wager from 0 up to ${MAX_WAGER} points, but never more than your score.`,
    "Confirm it. Once the question appears, your wager is locked.",
    "Get it right and you win the round points plus your wager. Get it wrong or run out of time and you lose the wager. Your total never drops below zero.",
  ],
};

export default function HowToPlayPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6 sm:pt-8">
        <PageHeader kicker="Flight manual" title="How to play Astroquint">
          A game is one trip through five worlds, one challenge each. It takes about three minutes. Answer
          correctly to score, and answer quickly to score more.
        </PageHeader>

        <section aria-labelledby="worlds-heading">
          <h2 id="worlds-heading" className="sr-only">
            The five worlds
          </h2>
          <ol className="space-y-4">
            {WORLDS.map((w) => (
              <li key={w.id} id={w.id} className="scroll-mt-28">
                <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
                  <div className="w-20 shrink-0 sm:w-24">
                    <Planet palette={w.palette} surface={w.surface} spinSeconds={32} glow={0.6} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="hud-label" style={{ color: w.palette.text }}>
                        {w.code} · {w.theme}
                      </p>
                      <p className="inline-flex items-center gap-1 text-xs text-fg-muted">
                        <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="tabular">{w.timeLimitMs / 1000} seconds</span>
                      </p>
                    </div>
                    <h3 className="mt-1 font-display text-2xl font-bold tracking-[-0.02em]">{w.name}</h3>
                    <ul className="mt-3 space-y-1.5 text-fg-muted">
                      {HOW[w.id].map((line) => (
                        <li key={line} className="flex gap-3">
                          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-fg-muted" aria-hidden="true" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="scoring-heading" className="mt-14">
          <h2 id="scoring-heading" className="font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
            Scoring
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Card className="p-5">
              <Gauge className="h-6 w-6 text-action" aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg font-semibold">Correct answer</h3>
              <p className="mt-1 text-fg-muted">
                <span className="tabular font-semibold text-fg">{BASE_POINTS}</span> points, plus a speed bonus of up
                to <span className="tabular font-semibold text-fg">{MAX_SPEED_BONUS}</span>. The most a round can be
                worth is <span className="tabular font-semibold text-fg">{BASE_POINTS + MAX_SPEED_BONUS}</span>.
              </p>
            </Card>
            <Card className="p-5">
              <Timer className="h-6 w-6 text-reward" aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg font-semibold">Speed bonus</h3>
              <p className="mt-1 text-fg-muted">
                The bonus is the share of time left on the clock. Answer with half the time left and you get 50.
                Wrong answers and timeouts score 0.
              </p>
            </Card>
            <Card className="p-5">
              <Coins className="h-6 w-6 text-w5" aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg font-semibold">Final Bet</h3>
              <p className="mt-1 text-fg-muted">
                Win the round points plus your wager, or lose the wager. Your total never goes below zero.
              </p>
            </Card>
          </div>
          <p className="mt-4 text-sm text-fg-muted">
            In ranked modes the server keeps the official time and does all the scoring, so results can be trusted.
          </p>
        </section>

        <section aria-labelledby="modes-heading" className="mt-14">
          <h2 id="modes-heading" className="font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
            Modes
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              { icon: User, name: "Solo Orbit", text: "Play anytime with no account. You get new questions on each run." },
              { icon: CalendarClock, name: "Daily Orbit", text: "Everyone gets the same five challenges each UTC day. One ranked attempt, unlimited practice." },
              { icon: Users, name: "Party Mode", text: "A private room for 2–8 friends. The server runs synchronized rounds and keeps a live leaderboard." },
            ].map(({ icon: Icon, name, text }) => (
              <Card key={name} className="p-5">
                <Icon className="h-6 w-6 text-brand-soft" aria-hidden="true" />
                <h3 className="mt-3 font-display text-lg font-semibold">{name}</h3>
                <p className="mt-1 text-fg-muted">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="access-heading" className="mt-14">
          <h2 id="access-heading" className="font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
            Comfort &amp; accessibility
          </h2>
          <ul className="mt-4 max-w-2xl space-y-2 text-fg-muted">
            <li>Everything works with a keyboard, and every drag action has a button alternative.</li>
            <li>“Reduce motion” in the menu or footer calms all animation. Your system setting is respected too.</li>
            <li>Sound is off by default, and you never need audio or colour alone to understand a result.</li>
          </ul>
        </section>
      </div>
    </PageTransition>
  );
}
