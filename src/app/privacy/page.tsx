import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Privacy", description: "How Astroquint handles data (template pending legal review)." };

export default function PrivacyPage() {
  return (
    <PageTransition>
      <LegalPage title="Privacy notice">
        <p>Operator: [legal entity name, address, contact email]. Last updated: [date].</p>
        <h2>What we collect</h2>
        <ul>
          <li>A random guest identifier, stored in a signed, HttpOnly cookie (<code>aq_session</code>) so ranked results and profiles stay yours. No account, email or password is required.</li>
          <li>The display name you choose, which is shown to other players on leaderboards and in Party rooms.</li>
          <li>Gameplay records for Daily Orbit and Party Mode: answers, server timestamps, scores and achievements.</li>
          <li>Your IP address, used for rate limiting. The app keeps it briefly in server memory and may store a salted one-way hash of it (never the address itself) to limit abuse across servers. [Retention period for these hashes: confirm once automated cleanup is scheduled.] Our hosting provider, Vercel, also processes request logs: [Vercel log retention for your plan].</li>
        </ul>
        <h2>On your device only</h2>
        <ul>
          <li>Sound and reduced-motion preferences, your last-used Party name, recently seen Solo questions and an in-progress Solo run, all in local storage. They never leave your browser except as part of game requests.</li>
        </ul>
        <h2>What we don&apos;t do</h2>
        <ul>
          <li>No advertising or third-party tracking scripts. No selling of data.</li>
        </ul>
        <h2>Retention</h2>
        <ul>
          <li>Party rooms are deleted after 2 hours of inactivity. Practice matches are deleted after 30 days. Ranked results and profiles are kept [period].</li>
        </ul>
        <h2>Your rights</h2>
        <p>[Describe access, correction and deletion requests, the legal basis for processing, and the supervisory authority, as applicable to your jurisdiction.]</p>
        <h2>Service providers</h2>
        <ul>
          <li>Vercel: hosts the website and runs the game server. [Region(s)]</li>
          <li>Supabase: stores profiles, games, Daily results and Party rooms, and relays live Party updates. [Project region]</li>
        </ul>
        <p>[Confirm data processing agreements with both providers and list any international transfer safeguards.]</p>
      </LegalPage>
    </PageTransition>
  );
}
