import { cn } from "@/lib/utils/cn";

/** Original Astroquint scout ship. Points up; rotate the wrapper to steer. */
export function Ship({ className, color = "#B9F46D", flame = true }: { className?: string; color?: string; flame?: boolean }) {
  return (
    <svg viewBox="0 0 24 32" className={cn("overflow-visible", className)} aria-hidden="true">
      {flame && (
        <path d="M9 24 Q12 33 15 24 Z" fill="#FFB681" className="origin-top animate-[twinkle_0.35s_ease-in-out_infinite]" />
      )}
      <path d="M12 1 C17 7 18 15 17 23 L7 23 C6 15 7 7 12 1 Z" fill="#E9ECF8" />
      <path d="M12 1 C14.5 4 15.8 8 16.4 12 L7.6 12 C8.2 8 9.5 4 12 1 Z" fill={color} />
      <circle cx="12" cy="15" r="2.4" fill="#191F36" stroke={color} strokeWidth="1" />
      <path d="M7 17 L2 25 L7 23 Z M17 17 L22 25 L17 23 Z" fill="#9167F4" />
    </svg>
  );
}
