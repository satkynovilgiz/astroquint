import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { PartyLanding } from "@/components/party/party-landing";

export const metadata: Metadata = { title: "Party Mode", description: "Create a private Astroquint room and race 2–8 friends through five worlds." };

export default function PartyPage() {
  return (
    <PageTransition>
      <PartyLanding />
    </PageTransition>
  );
}
