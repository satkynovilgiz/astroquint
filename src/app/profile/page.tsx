import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata: Metadata = { title: "Profile", description: "Your Astroquint pilot profile, stats and achievements." };

export default function ProfilePage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 sm:pt-8">
        <PageHeader kicker="Pilot profile" title="Your logbook" />
        <ProfileView />
      </div>
    </PageTransition>
  );
}
