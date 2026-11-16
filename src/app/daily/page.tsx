import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { DailyOrbit } from "@/components/daily/daily-orbit";

export const metadata: Metadata = {
  title: "Daily Orbit",
  description: "Today's shared five-world challenge. Everyone gets the same questions; one ranked attempt per day.",
};

export default function DailyPage() {
  return (
    <PageTransition>
      <DailyOrbit />
    </PageTransition>
  );
}
