import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { OrbitStatus } from "@/components/layout/orbit-status";
import { getWorld } from "@/features/worlds/worlds";

export const metadata: Metadata = { title: "Solo Orbit" };

export default function SoloPage() {
  const w = getWorld("pattern-break");
  return (
    <PageTransition>
      <OrbitStatus
        kicker="Solo Orbit"
        title="Your solo flight is being assembled"
        milestone="Milestone 2"
        description="The full five-world solo game is the next milestone. This page will become the playable game; nothing here is simulated in the meantime."
        upcoming={[
          "All five worlds with timers, feedback and explanations",
          "Planet-to-planet travel with a skippable warp sequence",
          "Final Bet wagering and the animated results screen",
          "A verified starter bank of 50+ questions",
        ]}
        palette={w.palette}
        surface={w.surface}
      />
    </PageTransition>
  );
}
