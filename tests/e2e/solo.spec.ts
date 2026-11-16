import { expect, test } from "@playwright/test";
import { answerRound, question, readSoloGame, type Plan } from "./helpers";

const WORLD_NAMES = ["Pattern Break", "Truth Trap", "Timeline", "GeoTap", "Final Bet"];

async function playSolo(page: import("@playwright/test").Page, plans: Plan[], wager: "All in" | "Nothing") {
  await page.goto("/play/solo");
  // Relaxed mode makes full-run scores exact (100 per correct answer) and immune to CI timing.
  await page.getByRole("switch", { name: /Relaxed mode/ }).click();
  await page.getByRole("button", { name: "Launch solo run" }).click();
  const saved = await readSoloGame(page);
  expect(saved.rounds).toHaveLength(5);

  for (let i = 0; i < 5; i++) {
    const name = WORLD_NAMES[i];
    // Every step is a server round-trip; allow for a busy machine.
    await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible({ timeout: 15_000 });
    if (i === 4) {
      await page.getByRole("button", { name: "Place your bet" }).click();
      await page.getByRole("button", { name: wager, exact: true }).click();
      await page.getByRole("button", { name: /^Bet \d+ points$/ }).click();
      await page.getByRole("button", { name: /Lock wager/ }).click();
    } else {
      await page.getByRole("button", { name: `Start ${name}` }).click();
    }
    await answerRound(page, question(saved.rounds[i].questionId), saved.seed, plans[i]);
    const verdict = page.getByRole("heading", { level: 3, name: plans[i] === "right" ? "Correct!" : "Not quite" });
    await expect(verdict).toBeVisible({ timeout: 15_000 });
    if (i < 4) {
      await page.getByRole("button", { name: `Travel to ${WORLD_NAMES[i + 1]}` }).click();
      // Skip the travel animation to keep the test brisk (also exercises Skip).
      const skip = page.getByRole("button", { name: /Skip/ });
      if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 1500 }).catch(() => {});
    } else {
      await page.getByRole("button", { name: "See results" }).click();
    }
  }
}

test.describe("solo orbit", () => {
  test.describe.configure({ timeout: 90_000 });

  test("a perfect run scores, unlocks achievements and can be replayed", async ({ page }) => {
    await playSolo(page, ["right", "right", "right", "right", "right"], "All in");
    await expect(page.getByRole("heading", { name: "Perfect orbit!" })).toBeVisible();
    await expect(page.getByText("5/5")).toBeVisible();
    await expect(page.getByText("100%")).toBeVisible();
    // Relaxed: 5 × 100 base points + 300 winning wager.
    await expect(page.getByLabel("Final score 800")).toBeVisible();
    await expect(page.getByText("Perfect Orbit", { exact: true })).toBeVisible();
    await expect(page.getByText("Unlocked").first()).toBeAttached();

    await page.getByRole("button", { name: "Play again" }).click();
    await expect(page.getByRole("heading", { name: "Pattern Break", level: 2 })).toBeVisible();
  });

  test("a wrong final answer loses the wager and never goes negative", async ({ page }) => {
    await playSolo(page, ["right", "wrong", "wrong", "wrong", "wrong"], "All in");
    await expect(page.getByText("1/5")).toBeVisible();
    await expect(page.getByLabel("Final score 0")).toBeVisible();
  });

  test("a fast correct answer earns a speed bonus", async ({ page }) => {
    await page.goto("/play/solo");
    await page.getByRole("button", { name: "Launch solo run" }).click();
    await page.getByRole("button", { name: "Start Pattern Break" }).click();
    const saved = await readSoloGame(page);
    await answerRound(page, question(saved.rounds[0].questionId), saved.seed, "right");
    await expect(page.getByRole("heading", { name: "Correct!" })).toBeVisible();
    await page.waitForTimeout(200);
    const after = (await readSoloGame(page)).rounds[0].points;
    expect(after).toBeGreaterThan(100);
    expect(after).toBeLessThanOrEqual(200);
  });

  test("progress survives a reload", async ({ page }) => {
    await page.goto("/play/solo");
    await page.getByRole("button", { name: "Launch solo run" }).click();
    await page.getByRole("button", { name: "Start Pattern Break" }).click();
    const saved = await readSoloGame(page);
    await answerRound(page, question(saved.rounds[0].questionId), saved.seed, "right");
    await expect(page.getByRole("heading", { name: "Correct!" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Correct!" })).toBeVisible();
    // The locked answer cannot be changed after reload.
    await expect(page.getByRole("list", { name: "Answer options" }).getByRole("button").first()).toBeDisabled();
  });

  test("the timer runs out and scores zero (server clock)", async ({ page }) => {
    // Real time: the server, not the browser, decides when the round has expired.
    await page.goto("/play/solo");
    await page.getByRole("button", { name: "Launch solo run" }).click();
    await page.getByRole("button", { name: "Start Pattern Break" }).click();
    await expect(page.getByRole("heading", { name: "Time's up" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("+0 pts")).toBeVisible();
  });

  test("relaxed mode has no timer", async ({ page }) => {
    await page.goto("/play/solo");
    await page.getByRole("switch", { name: /Relaxed mode/ }).click();
    await page.getByRole("button", { name: "Launch solo run" }).click();
    await page.getByRole("button", { name: "Start Pattern Break" }).click();
    await expect(page.getByLabel("Untimed round")).toBeVisible();
  });
});

test.describe("solo orbit on mobile", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });
  test.describe.configure({ timeout: 90_000 });

  test("full run is playable at phone width without horizontal scroll", async ({ page }) => {
    await playSolo(page, ["right", "wrong", "right", "right", "wrong"], "Nothing");
    await expect(page.getByText("3/5")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
