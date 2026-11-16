import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { SoloGameRoot } from "@/components/game/solo-game";

export const metadata: Metadata = {
  title: "Solo Orbit",
  description: "Play all five Astroquint worlds solo: Pattern Break, Truth Trap, Timeline, GeoTap and Final Bet.",
};

export default function SoloPage() {
  return (
    <PageTransition>
      <SoloGameRoot />
    </PageTransition>
  );
}
