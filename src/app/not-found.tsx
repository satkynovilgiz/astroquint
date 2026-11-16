import { Home } from "lucide-react";
import { Planet } from "@/components/animations/planet";
import { ButtonLink } from "@/components/ui/button";
import { CORE_PALETTE } from "@/components/brand/palette";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-12 text-center">
      <div className="w-40 animate-drift" style={{ animationDuration: "9s" }}>
        <Planet palette={{ ...CORE_PALETTE, primary: "#3A4366", highlight: "#A4AEC6", glow: "#5B6690" }} surface="bubbles" glow={0.4} />
      </div>
      <p className="hud-label mt-8 text-brand-soft">Error 404 · Signal lost</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.03em]">This sector is empty</h1>
      <p className="mt-3 text-fg-muted">The page you were looking for drifted out of orbit, or never existed.</p>
      <ButtonLink href="/" transitionTypes={["nav-back"]} className="mt-8" icon={<Home className="h-4 w-4" aria-hidden="true" />}>
        Return to base
      </ButtonLink>
    </div>
  );
}
