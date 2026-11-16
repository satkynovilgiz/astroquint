import type { ReactNode } from "react";

export function PageHeader({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 max-w-2xl sm:mb-10">
      <p className="hud-label text-brand-soft">{kicker}</p>
      <h1 className="mt-3 font-display text-[clamp(2rem,6vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.03em] text-balance">
        {title}
      </h1>
      {children && <div className="mt-4 text-[1.05rem] leading-relaxed text-fg-muted text-pretty">{children}</div>}
    </div>
  );
}
