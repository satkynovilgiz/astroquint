import { expect, test } from "@playwright/test";
import { answerBlind, playThrough } from "./helpers";

test.describe("daily orbit", () => {
  test.describe.configure({ timeout: 120_000 });

  test("ranked run is recorded once, practice is allowed, leaderboard & profile update", async ({ page }) => {
    await page.goto("/daily");
    await expect(page.getByRole("heading", { name: "Same five worlds for everyone" })).toBeVisible();
    await page.getByRole("button", { name: "Play ranked orbit" }).click();
    await expect(page.getByText("Ranked", { exact: true })).toBeVisible();

    await playThrough(page, (i) => answerBlind(page, i));
    await expect(page.getByText(/You placed #\d+ of \d+/)).toBeVisible();

    // Back on the Daily page the ranked result is locked in; no second ranked attempt.
    await page.getByRole("button", { name: "Back to Daily Orbit" }).click();
    await expect(page.getByText("Ranked result locked in")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play ranked orbit" })).toHaveCount(0);

    // The API refuses a second ranked attempt even if called directly.
    const second = await page.request.post("/api/daily/start", { data: { practice: false } });
    expect(second.status()).toBe(409);

    // Leaderboard shows us.
    await page.goto("/leaderboard");
    await expect(page.getByText("You", { exact: true })).toBeVisible();

    // Profile shows the ranked game; rename works.
    await page.goto("/profile");
    await expect(page.getByText("Ranked", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Rename" }).click();
    await page.getByLabel("Display name").fill("Test Pilot");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Test Pilot" })).toBeVisible();

    // Public result card shows the score without question content.
    await page.getByRole("link", { name: /Ranked/ }).first().click();
    await expect(page.getByRole("heading", { name: "Test Pilot scored" })).toBeVisible();
    await expect(page.getByText(/worlds conquered/)).toBeVisible();
  });

  test("practice runs are unranked", async ({ page }) => {
    await page.goto("/daily");
    await page.getByRole("button", { name: "Practice", exact: true }).click();
    await expect(page.getByText("Practice", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Start Pattern Break" }).click();
    await answerBlind(page, 0);
    await expect(page.getByRole("heading", { level: 3, name: /Correct!|Not quite/ })).toBeVisible();
  });

  test("rejects bad input and other players' matches", async ({ page, request }) => {
    const bad = await request.post("/api/daily/start", { data: "not json", headers: { "content-type": "application/json" } });
    expect(bad.status()).toBe(400);
    const name = await request.patch("/api/profile", { data: { displayName: "<script>" } });
    expect(name.status()).toBe(400);
    // A match id that isn't ours is indistinguishable from a missing one.
    await page.request.post("/api/session");
    const res = await page.request.post("/api/matches/d-2026-01-01-ffffffffffffffffffffffffffffffff/actions", { data: { type: "begin" } });
    expect(res.status()).toBe(404);
    const garbage = await page.request.post("/api/matches/x/actions", { data: { type: "submit", answer: { kind: "choice", index: 99 } } });
    expect(garbage.status()).toBe(400);
  });

  test("unknown result ids show the not-found screen", async ({ page }) => {
    await page.goto("/results/does-not-exist");
    await expect(page.getByRole("heading", { name: "This sector is empty" })).toBeVisible();
  });
});
