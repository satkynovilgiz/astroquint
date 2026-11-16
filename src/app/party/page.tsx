import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { OrbitStatus } from "@/components/layout/orbit-status";
import { getWorld } from "@/features/worlds/worlds";

export const metadata: Metadata = { title: "Party Mode" };

export default function PartyPage() {
  const w = getWorld("geotap");
  return (
    <PageTransition>
      <OrbitStatus
        kicker="Party Mode"
        title="The party ship is still in the hangar"
        milestone="Milestone 4"
        description="Private rooms for 2–8 friends with server-run rounds. It depends on real-time infrastructure that arrives after persistence is in place."
        upcoming={[
          "Private rooms with short invite codes and shareable links",
          "Live presence, host controls and ready checks",
          "Synchronized rounds with server-authoritative timing and scoring",
          "Reconnection, final rankings and rematches",
        ]}
        palette={w.palette}
        surface={w.surface}
      />
    </PageTransition>
  );
}
