import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { __resetPreferencesCache } from "@/features/preferences/store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/play",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

import { SiteHeader } from "@/components/layout/site-header";
import { ModeSelect } from "@/components/play/mode-select";
import { WorldsPreview } from "@/components/home/worlds-preview";

beforeEach(() => __resetPreferencesCache());

describe("SiteHeader", () => {
  it("marks the current section and links to key pages", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Play" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Leaderboard" })).toHaveAttribute("href", "/leaderboard");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });

  it("toggles sound and remembers it", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: /sound off/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: /sound on/i })).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("astroquint:prefs:v1")).toContain('"sound":true');
  });

  it("opens the mobile menu with settings and closes it", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog).toHaveAttribute("open");
    const motionSwitch = within(dialog).getByRole("switch", { name: /reduce motion/i });
    await user.click(motionSwitch);
    expect(motionSwitch).toHaveAttribute("aria-checked", "true");
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(dialog).not.toHaveAttribute("open");
  });
});

describe("ModeSelect", () => {
  it("offers the three game modes as real links", () => {
    render(<ModeSelect />);
    expect(screen.getByRole("link", { name: /solo orbit/i })).toHaveAttribute("href", "/play/solo");
    expect(screen.getByRole("link", { name: /daily orbit/i })).toHaveAttribute("href", "/daily");
    expect(screen.getByRole("link", { name: /party mode/i })).toHaveAttribute("href", "/party");
  });
});

describe("WorldsPreview", () => {
  it("lists all five worlds in order", () => {
    render(<WorldsPreview />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items.map((li) => within(li).getByRole("heading").textContent)).toEqual([
      "Pattern Break",
      "Truth Trap",
      "Timeline",
      "GeoTap",
      "Final Bet",
    ]);
  });
});
