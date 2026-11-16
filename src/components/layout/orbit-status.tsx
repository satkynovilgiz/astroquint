import { ArrowLeft, BookOpen, Construction } from "lucide-react";
import { Planet } from "@/components/animations/planet";
import { ButtonLink } from "@/components/ui/button";
import type { WorldPalette, WorldDefinition } from "@/features/worlds/worlds";

/**
 * Honest status screen for areas that are scheduled for a later milestone.
 * States plainly what is not available yet instead of showing fake UI.
 */
export function OrbitStatus({
  kicker,
  title,
  milestone,
  description,
  upcoming,
  palette,
  surface,
}: {
  kicker: string;
  title: string;
  milestone: string;
  description: string;
  upcoming: string[];
  palette: WorldPalette;
  surface: WorldDefinition["surface"];
}) {
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 overflow-x-clip px-4 py-6 sm:px-6 md:grid-cols-[1fr_0.8fr] md:py-12">
      <div className="order-2 md:order-1">
        <p className="hud-label text-brand-soft">{kicker}</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,6vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.03em]">
          {title}
        </h1>
        <p className="mt-4 inline-flex items-center gap-2 rounded-pill border border-reward/40 bg-reward/10 px-3 py-1.5 text-sm font-medium text-reward">
          <Construction className="h-4 w-4" aria-hidden="true" />
          Under construction · {milestone}
        </p>
        <p className="mt-5 max-w-lg leading-relaxed text-fg-muted">{description}</p>
        <ul className="mt-5 space-y-2 text-[0.95rem]">
          {upcoming.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: palette.glow }} aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/play" transitionTypes={["nav-back"]} variant="secondary" icon={<ArrowLeft className="order-first h-4 w-4" aria-hidden="true" />}>
            Back to modes
          </ButtonLink>
          <ButtonLink href="/how-to-play" transitionTypes={["nav-forward"]} variant="ghost" icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}>
            Read how it works
          </ButtonLink>
        </div>
      </div>
      <div className="order-1 mx-auto w-[min(60vw,300px)] md:order-2 md:w-[72%] lg:w-full lg:max-w-[340px]">
        <Planet palette={palette} surface={surface} spinSeconds={36} glow={1} ring />
      </div>
    </div>
  );
}
