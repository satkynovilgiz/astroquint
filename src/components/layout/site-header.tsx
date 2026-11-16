"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { Menu, Sparkles, UserRound, Volume2, Wind } from "lucide-react";
import { primaryNav } from "@/lib/config/site";
import { Logo } from "@/components/brand/logo";
import { Dialog } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ButtonLink } from "@/components/ui/button";
import { usePreferences } from "@/features/preferences/use-preferences";
import { playSound } from "@/features/audio/synth";
import { spring } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";
import { useScrolled } from "@/hooks/use-scrolled";
import { SoundToggle } from "./sound-toggle";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [prefs, setPrefs] = usePreferences();
  const scrolled = useScrolled();

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        "sticky top-0 z-50 border-b pt-[var(--safe-top)] transition-[background-color,border-color,backdrop-filter] duration-[var(--dur-base)]",
        scrolled ? "border-line bg-space/80 backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6">
        <Link
          href="/"
          transitionTypes={["nav-back"]}
          className="-ml-1 flex min-h-11 items-center rounded-full px-1"
          aria-label="Astroquint home"
        >
          <Logo />
        </Link>

        <nav aria-label="Primary" className="panel hidden items-center gap-1 rounded-pill p-1 md:flex">
          {primaryNav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                transitionTypes={["nav-forward"]}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center rounded-pill px-4 text-sm font-medium transition-colors",
                  active ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    transition={spring.settle}
                    className="absolute inset-0 rounded-pill bg-white/10 shadow-[inset_0_0_0_1px_rgb(145_103_244/0.5)]"
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <SoundToggle />
          <Link
            href="/profile"
            transitionTypes={["nav-forward"]}
            aria-label="Profile"
            aria-current={isActive(pathname, "/profile") ? "page" : undefined}
            className="hidden h-11 w-11 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg md:grid"
          >
            <UserRound className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => {
              playSound("tap");
              setMenuOpen(true);
            }}
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="grid h-11 w-11 place-items-center rounded-full border border-line text-fg transition-colors hover:border-line-strong md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" variant="sheet">
        <nav aria-label="Mobile">
          <ul className="space-y-1">
            {[...primaryNav, { href: "/profile", label: "Profile" }].map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    transitionTypes={["nav-forward"]}
                    onClick={() => setMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center justify-between rounded-2xl px-4 font-display text-lg font-medium transition-colors",
                      active ? "bg-white/10 text-fg" : "text-fg-muted hover:bg-white/5 hover:text-fg",
                    )}
                  >
                    {item.label}
                    {active && <span className="h-2 w-2 rounded-full bg-action" aria-hidden="true" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="my-4 h-px bg-line" />
        <p className="hud-label mb-1 px-3 text-fg-muted">Settings</p>
        <Switch
          checked={prefs.sound}
          onChange={(sound) => {
            setPrefs({ sound });
            if (sound) playSound("toggle-on", { force: true });
          }}
          label="Sound effects"
          description="Short, quiet interface sounds"
          icon={<Volume2 className="h-4 w-4" />}
        />
        <Switch
          checked={prefs.motion === "reduced"}
          onChange={(reduced) => setPrefs({ motion: reduced ? "reduced" : "system" })}
          label="Reduce motion"
          description="Calmer transitions, no drifting space"
          icon={<Wind className="h-4 w-4" />}
        />
        <ButtonLink
          href="/play"
          transitionTypes={["warp"]}
          onClick={() => setMenuOpen(false)}
          size="lg"
          className="mt-4 w-full"
          icon={<Sparkles className="h-5 w-5" />}
        >
          Start Playing
        </ButtonLink>
      </Dialog>
    </header>
  );
}
