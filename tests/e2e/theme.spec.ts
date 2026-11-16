import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("themes", () => {
  test("dark (charcoal) theme is the default for new visitors", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toBe("rgb(18, 20, 29)"); // deep charcoal, not pure black
  });

  test("toggle switches theme, persists across navigation and reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("link", { name: "How to Play" }).first().click();
    await expect(page).toHaveURL(/how-to-play/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("saved theme applies before first paint (no flash)", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("astroquint:prefs:v1", JSON.stringify({ theme: "light" }));
      document.addEventListener("DOMContentLoaded", () => {
        (window as unknown as { __themeAtDcl: string }).__themeAtDcl = document.documentElement.dataset.theme ?? "";
      });
    });
    await page.goto("/");
    expect(await page.evaluate(() => (window as unknown as { __themeAtDcl: string }).__themeAtDcl)).toBe("light");
  });

  test("mobile menu has a light theme switch", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("switch", { name: /Light theme/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  for (const path of ["/", "/play", "/how-to-play", "/daily", "/party", "/play/solo"]) {
    test(`light theme is accessible: ${path}`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("astroquint:prefs:v1", JSON.stringify({ theme: "light" })));
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(1800);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
    });
  }
});
