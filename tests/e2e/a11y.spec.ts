import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function scan(page: Page, label: string) {
  // Let entrance animations and transient feedback (score chips ~1.4s) settle,
  // so contrast is measured on final colours rather than mid-fade.
  await page.waitForTimeout(1800);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× — ${v.nodes[0]?.target.join(" ")}`);
  expect(summary, `${label} accessibility violations`).toEqual([]);
}

const PAGES = ["/", "/play", "/how-to-play", "/daily", "/leaderboard", "/profile", "/party", "/play/solo"];

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await scan(page, path);
  });
}

test("axe: in-game screens and mobile menu", async ({ page }) => {
  await page.goto("/play/solo");
  await page.getByRole("switch", { name: /Relaxed mode/ }).click();
  await page.getByRole("button", { name: "Launch solo run" }).click();
  await expect(page.getByRole("button", { name: "Start Pattern Break" })).toBeVisible();
  await scan(page, "world intro");
  await page.getByRole("button", { name: "Start Pattern Break" }).click();
  await expect(page.getByRole("list", { name: "Answer options" })).toBeVisible();
  await scan(page, "question");
  await page.getByRole("list", { name: "Answer options" }).getByRole("button").first().click();
  await expect(page.getByRole("heading", { level: 3, name: /Correct!|Not quite/ })).toBeVisible();
  await scan(page, "reveal");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open menu" }).click();
  await scan(page, "mobile menu");
});
