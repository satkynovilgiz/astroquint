import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { OrbitStatus } from "@/components/layout/orbit-status";
import { getWorld } from "@/features/worlds/worlds";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  const w = getWorld("truth-trap");
  return (
    <PageTransition>
      <OrbitStatus
        kicker="Leaderboard"
        title="No rankings yet, and none made up"
        milestone="Milestone 3"
        description="Rankings will only show real, server-verified results. Until scoring is stored on the server, there's nothing honest to rank."
        upcoming={["Daily Orbit rankings by UTC day", "Your personal best and recent placements"]}
        palette={w.palette}
        surface={w.surface}
      />
    </PageTransition>
  );
}
