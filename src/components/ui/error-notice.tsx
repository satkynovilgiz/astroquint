"use client";

import { motion } from "motion/react";
import { AlertTriangle, CloudOff, DatabaseZap, KeyRound, RotateCcw, Timer, WifiOff } from "lucide-react";
import type { FriendlyError } from "@/lib/api/errors";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

const ICONS = { network: WifiOff, config: KeyRound, storage: DatabaseZap, session: KeyRound, rate: Timer, input: AlertTriangle, state: AlertTriangle, server: CloudOff };

/** Consistent, honest error display with an optional retry and a support reference. */
export function ErrorNotice({ error, onRetry, retrying, className, children }: { error: FriendlyError; onRetry?: () => void; retrying?: boolean; className?: string; children?: React.ReactNode }) {
  const Icon = ICONS[error.kind];
  const tone = error.kind === "storage" || error.kind === "config" ? "border-reward/50 bg-reward/10" : "border-danger/40 bg-danger/10";
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3 rounded-2xl border p-4 text-left", tone, className)}
    >
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", error.kind === "storage" || error.kind === "config" ? "text-reward" : "text-danger")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{error.title}</p>
        <p className="mt-0.5 text-sm text-fg-muted">{error.message}</p>
        {children}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {error.retryable && onRetry && (
            <Button variant="secondary" onClick={onRetry} disabled={retrying} icon={<RotateCcw className={cn("h-4 w-4", retrying && "animate-spin")} aria-hidden="true" />}>
              Try again
            </Button>
          )}
          {(error.requestId || error.code) && (
            <span className="text-xs text-fg-muted/80">
              Ref: {error.code}
              {error.requestId ? ` · ${error.requestId}` : ""}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
