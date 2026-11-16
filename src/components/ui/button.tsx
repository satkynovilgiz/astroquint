"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { pressable } from "@/lib/motion/tokens";
import { playSound } from "@/features/audio/synth";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 text-center sm:whitespace-nowrap rounded-pill font-display font-semibold tracking-[-0.01em] transition-[background-color,border-color,box-shadow,color] duration-[var(--dur-fast)] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  // Inner top highlight + soft accent glow gives the pill some physical depth.
  primary:
    "bg-action text-action-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(0_0_0/0.18),0_10px_28px_-12px_color-mix(in_srgb,var(--aq-action)_75%,transparent)] hover:brightness-105 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_2px_4px_rgb(0_0_0/0.18),0_16px_38px_-12px_color-mix(in_srgb,var(--aq-action)_90%,transparent)]",
  secondary:
    "bg-surface-2 text-fg border border-line-strong shadow-[var(--aq-shadow)] hover:border-brand hover:shadow-[var(--aq-shadow-lift)]",
  ghost: "text-fg-muted hover:text-fg hover:bg-fg/5",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-[0.95rem]",
  lg: "min-h-14 px-7 text-[1.05rem]",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  onClick,
  ...rest
}: CommonProps & Omit<HTMLMotionProps<"button">, "children">) {
  return (
    <motion.button
      type="button"
      {...pressable}
      className={buttonClasses(variant, size, className)}
      onClick={(e) => {
        playSound("tap");
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
      {icon}
    </motion.button>
  );
}

const MotionLink = motion.create(Link);

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  onClick,
  ...rest
}: CommonProps & Omit<ComponentProps<typeof MotionLink>, "children">) {
  return (
    <MotionLink
      {...pressable}
      className={buttonClasses(variant, size, className)}
      onClick={(e) => {
        playSound("tap");
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
      {icon}
    </MotionLink>
  );
}
