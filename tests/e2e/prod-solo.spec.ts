import { expect, test } from "@playwright/test";
import { answerRound, question, readSoloGame } from "./helpers";

const N = ["Pattern Break", "Truth Trap", "Timeline", "GeoTap", "Final Bet"];

for (const [label, vp] of [["desktop", { width: 1280, height: 820 }], ["mobile", { width: 390, height: 844 }]] as const) {
  test(`production: full solo game (${label})`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(vp);
    const errors: string[] = [];
    const bad: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("response", (r) => r.status() >= 400 && bad.push(`${r.status()} ${new URL(r.url()).pathname}`));

    await page.goto("/play/solo");
    await page.getByRole("switch", { name: /Relaxed mode/ }).click();
    await page.getByRole("button", { name: "Launch solo run" }).click();
    const saved = await readSoloGame(page);
    for (let i = 0; i < 5; i++) {
      await expect(page.getByRole("heading", { name: N[i], level: 2 })).toBeVisible({ timeout: 20_000 });
      if (i === 4) {
        await page.getByRole("button", { name: "Place your bet" }).click();
        await page.getByRole("button", { name: "All in", exact: true }).click();
        await page.getByRole("button", { name: /^Bet \d+ points$/ }).click();
        await page.getByRole("button", { name: /Lock wager/ }).click();
      } else {
        await page.getByRole("button", { name: `Start ${N[i]}` }).click();
      }
      await answerRound(page, question(saved.rounds[i].questionId), saved.seed, "right");
      await expect(page.getByRole("heading", { level: 3, name: "Correct!" })).toBeVisible({ timeout: 20_000 });
      if (i < 4) {
        await page.getByRole("button", { name: `Travel to ${N[i + 1]}` }).click();
        const skip = page.getByRole("button", { name: /Skip/ });
        if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 1500 }).catch(() => {});
      } else {
        await page.getByRole("button", { name: "See results" }).click();
      }
    }
    await expect(page.getByRole("heading", { name: "Perfect orbit!" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Final score 800")).toBeVisible();
    await page.screenshot({ path: `test-results/prod-results-${label}.png`, fullPage: true });
    await page.getByRole("button", { name: "Play again" }).click();
    await expect(page.getByRole("heading", { name: "Pattern Break", level: 2 })).toBeVisible({ timeout: 20_000 });
    expect(bad, "no failed requests").toEqual([]);
    expect(errors, "no console errors").toEqual([]);
  });
}
