import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { OrbitStatus } from "@/components/layout/orbit-status";
import { getWorld } from "@/features/worlds/worlds";

export const metadata: Metadata = { title: "Daily Orbit" };

export default function DailyPage() {
  const w = getWorld("final-bet");
  return (
    <PageTransition>
      <OrbitStatus
        kicker="Daily Orbit"
        title="The daily route needs a mission control"
        milestone="Milestone 3"
        description="Daily Orbit needs a server to choose the day's questions and record ranked results fairly, so it launches together with the database."
        upcoming={[
          "Identical questions for every player, rolling over at 00:00 UTC",
          "One ranked attempt per player per day, with practice replays",
          "A real daily leaderboard and a shareable result card",
        ]}
        palette={w.palette}
        surface={w.surface}
      />
    </PageTransition>
  );
}
