import type { Metadata } from "next";
import { PageTransition } from "@/components/layout/page-transition";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Terms", description: "Terms of use for Astroquint (template pending legal review)." };

export default function TermsPage() {
  return (
    <PageTransition>
      <LegalPage title="Terms of use">
        <p>These terms are between you and [legal entity name] (&quot;we&quot;). Last updated: [date].</p>
        <h2>Playing fair</h2>
        <ul>
          <li>Don&apos;t automate play, tamper with requests, or try to get answers before a round is revealed. We may remove results that we reasonably believe were obtained unfairly.</li>
          <li>Choose a display name that isn&apos;t offensive and doesn&apos;t impersonate anyone. We may change or remove names.</li>
        </ul>
        <h2>Content</h2>
        <ul>
          <li>Questions are written and checked carefully, and factual ones cite sources, but mistakes can happen. Report errors to [contact]. Scores may be corrected if a question is fixed.</li>
          <li>Map data: Natural Earth (public domain).</li>
        </ul>
        <h2>Availability</h2>
        <p>The game is provided &quot;as is&quot;, without guarantees of availability. [Liability limitations, governing law and age requirements, to be completed with legal counsel.]</p>
      </LegalPage>
    </PageTransition>
  );
}
