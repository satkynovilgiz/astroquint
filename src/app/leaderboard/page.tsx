import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { LeaderboardView } from "@/components/leaderboard/leaderboard-view";

export const metadata: Metadata = { title: "Leaderboard", description: "Daily Orbit rankings, verified on the server." };

export default function LeaderboardPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-6 sm:pt-8">
        <PageHeader kicker="Rankings" title="Daily leaderboard">
          The day&apos;s best ranked Daily Orbit scores. Step back through previous days with the arrows.
        </PageHeader>
        <LeaderboardView />
      </div>
    </PageTransition>
  );
}
