import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { ModeSelect } from "@/components/play/mode-select";

export const metadata: Metadata = {
  title: "Choose your orbit",
  description: "Play Astroquint solo, take on today's Daily Orbit, or challenge friends in Party Mode.",
};

export default function PlayPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-8">
        <PageHeader kicker="Mission select" title="Choose your orbit">
          Every mode flies the same five worlds: Pattern Break, Truth Trap, Timeline, GeoTap and Final Bet.
        </PageHeader>
        <ModeSelect />
      </div>
    </PageTransition>
  );
}
