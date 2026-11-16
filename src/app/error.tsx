"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      <p className="hud-label text-danger">System fault</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.03em]">Turbulence detected</h1>
      <p className="mt-3 text-fg-muted">Something went wrong while loading this screen. Your progress on this device is unaffected.</p>
      <Button onClick={reset} className="mt-8" icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}>
        Try again
      </Button>
    </div>
  );
}
