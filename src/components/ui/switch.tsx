"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { spring } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function Switch({ checked, onChange, label, description, icon, className }: SwitchProps) {
  const descId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={description ? descId : undefined}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-fg/5",
        className,
      )}
    >
      {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fg/5 text-fg-muted">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-fg">{label}</span>
        {description && (
          <span id={descId} className="block text-sm text-fg-muted">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-[var(--dur-base)]",
          checked ? "justify-end bg-action" : "justify-start bg-fg/15",
        )}
      >
        <motion.span layout transition={spring.press} className={cn("h-5 w-5 rounded-full", checked ? "bg-action-fg" : "bg-fg")} />
      </span>
    </button>
  );
}
