import { cn } from "@/lib/utils/cn";

/**
 * Astroquint mark: a planet crossed by a tilted orbit carrying five moons —
 * one for each world, in world order and colour.
 */
export function LogoMark({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("shrink-0", className)} aria-hidden="true">
      <defs>
        <radialGradient id="aq-mark-body" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#DCCEFF" />
          <stop offset="45%" stopColor="#7350E0" />
          <stop offset="100%" stopColor="#1A1040" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="10.5" fill="url(#aq-mark-body)" />
      <g
        transform="rotate(-20 20 20)"
        className={animated ? "origin-center" : undefined}
      >
        <ellipse cx="20" cy="20" rx="17.5" ry="6" fill="none" stroke="#C7B2FF" strokeOpacity="0.65" strokeWidth="1.3" />
        <circle cx="2.5" cy="20" r="2" fill="#9167F4" />
        <circle cx="10" cy="25.2" r="2" fill="#B9F46D" />
        <circle cx="21" cy="26" r="2" fill="#FFB681" />
        <circle cx="31.5" cy="24.3" r="2" fill="#3DD6C4" />
        <circle cx="37.5" cy="20" r="2" fill="#F5C451" />
      </g>
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9" />
      {!compact && (
        <span className="font-display text-[1.3rem] font-bold leading-none tracking-[-0.02em] text-fg">
          astro<span className="text-brand-soft">quint</span>
        </span>
      )}
      <span className="sr-only">Astroquint</span>
    </span>
  );
}
