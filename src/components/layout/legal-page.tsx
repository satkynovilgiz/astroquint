import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "./page-header";

/** Shell for legal templates. The banner must stay until counsel has reviewed the text. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 sm:pt-8">
      <PageHeader kicker="Legal" title={title} />
      <p role="note" className="mb-8 flex gap-3 rounded-2xl border border-reward/50 bg-reward/10 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-reward" aria-hidden="true" />
        <span>
          <strong>Template, not yet legally reviewed.</strong> This page describes how the software actually works, but it hasn&apos;t been reviewed by a
          lawyer. Items in [brackets] must be completed by the operator before public launch.
        </span>
      </p>
      <div className="space-y-6 leading-relaxed text-fg/90 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-fg-muted [&_ul]:space-y-1 [&_ul]:text-fg-muted">
        {children}
      </div>
    </div>
  );
}
