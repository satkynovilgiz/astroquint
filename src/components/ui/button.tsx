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
  primary:
    "bg-action text-action-fg shadow-[0_0_0_1px_rgb(185_244_109/0.4),0_10px_30px_-10px_rgb(185_244_109/0.7)] hover:shadow-[0_0_0_1px_rgb(185_244_109/0.7),0_14px_40px_-8px_rgb(185_244_109/0.85)]",
  secondary:
    "bg-surface-2/80 text-fg border border-line-strong hover:border-brand hover:bg-surface-2 backdrop-blur",
  ghost: "text-fg-muted hover:text-fg hover:bg-white/5",
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
