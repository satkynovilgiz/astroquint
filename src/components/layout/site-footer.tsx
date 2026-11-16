"use client";

import Link from "next/link";
import { Wind } from "lucide-react";
import { siteConfig } from "@/lib/config/site";
import { LogoMark } from "@/components/brand/logo";
import { usePreferences } from "@/features/preferences/use-preferences";
import { cn } from "@/lib/utils/cn";

export function SiteFooter() {
  const [prefs, setPrefs] = usePreferences();
  const reduced = prefs.motion === "reduced";
  return (
    <footer className="mx-auto mt-auto w-full max-w-6xl px-4 pb-[calc(1.5rem+var(--safe-bottom))] pt-16 sm:px-6">
      <div className="flex flex-col gap-4 border-t border-line pt-6 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span>
            {siteConfig.name} · <span className="text-fg/80">{siteConfig.tagline}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/how-to-play" transitionTypes={["nav-forward"]} className="min-h-11 content-center hover:text-fg">
            How to Play
          </Link>
          <Link href="/privacy" transitionTypes={["nav-forward"]} className="min-h-11 content-center hover:text-fg">
            Privacy
          </Link>
          <Link href="/terms" transitionTypes={["nav-forward"]} className="min-h-11 content-center hover:text-fg">
            Terms
          </Link>
          <button
            type="button"
            role="switch"
            aria-checked={reduced}
            onClick={() => setPrefs({ motion: reduced ? "system" : "reduced" })}
            className={cn("inline-flex min-h-11 items-center gap-2 hover:text-fg", reduced && "text-action")}
          >
            <Wind className="h-4 w-4" aria-hidden="true" />
            Reduce motion: {reduced ? "On" : "Off"}
          </button>
        </div>
      </div>
    </footer>
  );
}
