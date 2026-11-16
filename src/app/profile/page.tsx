import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { OrbitStatus } from "@/components/layout/orbit-status";
import { getWorld } from "@/features/worlds/worlds";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  const w = getWorld("timeline");
  return (
    <PageTransition>
      <OrbitStatus
        kicker="Pilot profile"
        title="Your logbook starts with your first flight"
        milestone="Milestone 3"
        description="Guest profiles, match history and achievements will be saved once the database is connected. You'll never need an account just to play."
        upcoming={["Secure guest identity, upgradeable to an account", "Match history and per-world stats", "Achievements such as Logic Explorer and Perfect Orbit"]}
        palette={w.palette}
        surface={w.surface}
      />
    </PageTransition>
  );
}
