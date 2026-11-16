"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** "sheet" slides from the bottom on mobile; "center" is a modal card. */
  variant?: "sheet" | "center";
  className?: string;
}

/**
 * Accessible modal built on the native <dialog> element: focus trapping,
 * Escape-to-close, inert background and top-layer stacking come from the
 * platform. Entry/exit animate with CSS (see globals.css).
 */
export function Dialog({ open, onClose, title, children, variant = "center", className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && el.open) {
      el.close();
    }
    if (!open) document.documentElement.style.overflow = "";
  }, [open]);

  useEffect(() => () => {
    document.documentElement.style.overflow = "";
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-variant={variant}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "aq-dialog panel m-0 max-h-[100dvh] max-w-none text-fg",
        variant === "sheet"
          ? "inset-x-0 bottom-0 top-auto w-full rounded-t-[1.75rem] pb-[calc(1.25rem+var(--safe-bottom))] sm:inset-auto sm:right-4 sm:top-4 sm:bottom-auto sm:w-[22rem] sm:rounded-[1.5rem] sm:pb-5"
          : "inset-0 m-auto h-fit w-[min(92vw,30rem)] rounded-[1.5rem]",
        "p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={titleId} className="font-display text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-full text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
