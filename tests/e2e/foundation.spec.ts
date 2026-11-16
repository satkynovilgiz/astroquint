import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [320, 375, 390, 414, 768, 1024, 1440];
const PAGES = ["/", "/play", "/how-to-play", "/play/solo", "/daily", "/party", "/leaderboard", "/profile", "/privacy", "/terms"];
const SHOTS = process.env.E2E_SHOTS_DIR;

async function noHorizontalOverflow(page: Page) {
  const { scroll, inner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(scroll, "page must not scroll horizontally").toBeLessThanOrEqual(inner);
}

for (const width of WIDTHS) {
  test.describe(`layout @ ${width}px`, () => {
    test.use({ viewport: { width, height: width < 768 ? 812 : 900 }, hasTouch: width < 768 });

    for (const path of PAGES) {
      test(`${path} renders without overflow`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForTimeout(900); // let entrance animations settle
        await noHorizontalOverflow(page);
        if (SHOTS && (path === "/" || path === "/play")) {
          // Scroll through so in-view entrances fire before the full-page capture.
          await page.evaluate(async () => {
            for (let y = 0; y < document.body.scrollHeight; y += 300) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 60));
            }
            window.scrollTo(0, 0);
          });
          await page.waitForTimeout(600);
          await page.screenshot({ path: `${SHOTS}/${path === "/" ? "home" : "play"}-${width}.png`, fullPage: true });
        }
      });
    }

    test("interactive targets are at least 44px tall", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(900);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("header a, header button, main a[class*='rounded-pill'], main button")]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ label: el.getAttribute("aria-label") ?? el.textContent?.trim(), h: el.getBoundingClientRect().height }))
          .filter((t) => t.h < 44),
      );
      expect(small).toEqual([]);
    });
  });
}

test.describe("motion", () => {
  test("orbit animates by default", async ({ page }) => {
    await page.goto("/");
    const sat = page.locator(".will-change-transform").first();
    const a = await sat.getAttribute("style");
    await page.waitForTimeout(500);
    expect(await sat.getAttribute("style")).not.toEqual(a);
  });

  test("orbit is still when the OS asks for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForTimeout(300);
    const sat = page.locator(".will-change-transform").first();
    const a = await sat.getAttribute("style");
    await page.waitForTimeout(600);
    expect(await sat.getAttribute("style")).toEqual(a);
  });

  test("world cards animate in when scrolled into view", async ({ page }) => {
    await page.goto("/");
    await page.locator("#worlds-title").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    const opacities = await page.locator("section[aria-labelledby=worlds-title] li").evaluateAll((els) =>
      els.map((el) => Number(getComputedStyle(el).opacity)),
    );
    expect(opacities).toEqual([1, 1, 1, 1, 1]);
  });

  test("header gains a solid backdrop after scrolling", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header").first();
    await expect(header).toHaveAttribute("data-scrolled", "false");
    await page.mouse.wheel(0, 600);
    await expect(header).toHaveAttribute("data-scrolled", "true");
  });

  test("reduced motion freezes the new ambient effects too", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForTimeout(500);
    const durations = await page.evaluate(() => {
      const ring = document.querySelector(".aurora-ring");
      const breathe = document.querySelector("[class*='core-breathe']");
      return {
        aurora: ring ? getComputedStyle(ring, "::before").animationDuration : "missing",
        breathe: breathe ? getComputedStyle(breathe).animationName : "missing",
      };
    });
    // Global reduced-motion rule collapses CSS animations; the breathing glow is motion-safe only.
    expect(["0.001ms", "1e-06s", "0s"]).toContain(durations.aurora);
    expect(durations.breathe).toBe("none");
  });

  test("Start Playing launches into mode select", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start Playing" }).click();
    await expect(page).toHaveURL(/\/play$/);
    await expect(page.getByRole("heading", { name: "Choose your orbit" })).toBeVisible();
  });
});

test.describe("mobile menu & preferences", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("menu opens, reduce-motion persists, links navigate", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    await menu.getByRole("switch", { name: /reduce motion/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await menu.getByRole("link", { name: "How to Play" }).click();
    await expect(page).toHaveURL(/how-to-play/);
    await expect(menu).toBeHidden();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  });

  test("Escape closes the menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Menu" })).toBeHidden();
  });
});

test.describe("keyboard & errors", () => {
  test("skip link is the first tab stop", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("mode cards are reachable and activate with Enter", async ({ page }) => {
    await page.goto("/play");
    const solo = page.getByRole("link", { name: /solo orbit/i });
    await solo.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/play\/solo$/);
  });

  test("unknown routes show the 404 screen", async ({ page }) => {
    const res = await page.goto("/nowhere-in-space");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "This sector is empty" })).toBeVisible();
  });
});
