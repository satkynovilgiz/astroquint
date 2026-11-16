import { expect, test, type Browser, type Page } from "@playwright/test";
import { answerBlind, playThrough } from "./helpers";

// Live-site checks for the database-backed modes. Player names start with
// "QA Bot" so the data can be identified and cleaned up afterwards.
//
// These tests WRITE to the database of the site they target. Against
// production they are skipped unless the owner explicitly opts in with
// ALLOW_PROD_WRITES=1 (see docs/operations.md).
const target = process.env.PROD_URL ?? "https://astroquint.vercel.app";
const isProduction = /astroquint\.vercel\.app/.test(target);
test.skip(isProduction && process.env.ALLOW_PROD_WRITES !== "1", "Writes to the production database — disabled unless ALLOW_PROD_WRITES=1");

function watch(page: Page) {
  const bad: string[] = [];
  const errors: string[] = [];
  page.on("response", (r) => r.status() >= 500 && bad.push(`${r.status()} ${new URL(r.url()).pathname}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  return { bad, errors };
}

test("production: Daily Orbit ranked run persists, second attempt refused, practice allowed", async ({ browser }) => {
  test.setTimeout(300_000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("Display name").fill("QA Bot Daily");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "QA Bot Daily" })).toBeVisible();

  await page.goto("/daily");
  await page.getByRole("button", { name: "Play ranked orbit" }).click();
  await expect(page.getByText("Ranked", { exact: true })).toBeVisible({ timeout: 20_000 });
  await playThrough(page, (i) => answerBlind(page, i));
  await expect(page.getByText(/You placed #\d+ of \d+/)).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Back to Daily Orbit" }).click();
  await expect(page.getByText("Ranked result locked in")).toBeVisible({ timeout: 20_000 });
  const second = await page.request.post("/api/daily/start", { data: { practice: false } });
  expect(second.status()).toBe(409);

  await page.getByRole("button", { name: "Practice run" }).click();
  await expect(page.getByText("Practice", { exact: true })).toBeVisible({ timeout: 20_000 });

  // Persistence: a fresh page load (new serverless invocation) still sees the result.
  await page.goto("/leaderboard");
  await expect(page.getByText("QA Bot Daily")).toBeVisible({ timeout: 20_000 });
  await page.goto("/profile");
  await expect(page.getByText("Ranked", { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  // A different visitor sees the same leaderboard entry (shared, persistent storage).
  const other = await (await browser.newContext()).newPage();
  await other.goto("/leaderboard");
  await expect(other.getByText("QA Bot Daily")).toBeVisible({ timeout: 20_000 });

  expect(w.bad, "no server errors").toEqual([]);
  expect(w.errors, "no console errors").toEqual([]);
});

async function player(browser: Browser, mobile = false) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true } : {});
  const page = await ctx.newPage();
  return { page, w: watch(page) };
}

async function waitForRound(page: Page, i: number) {
  if (i === 4) {
    await expect(page.getByRole("heading", { name: "How much will you risk?" })).toBeVisible({ timeout: 40_000 });
    await page.getByRole("button", { name: "Nothing", exact: true }).click();
    await page.getByRole("button", { name: /^Bet \d+ points$/ }).click();
    await page.getByRole("button", { name: /Lock wager/ }).click();
  }
  const marker = [
    page.getByRole("list", { name: "Answer options" }),
    page.getByRole("heading", { name: "Two are true. Which one is the lie?" }),
    page.getByRole("button", { name: "Lock in order" }),
    page.getByRole("application", { name: /World map/ }),
    page.getByRole("list", { name: "Answer options" }),
  ][i];
  await expect(marker).toBeVisible({ timeout: 40_000 });
}

test("production: Party Mode — two browsers, synchronized match, reconnect, rematch", async ({ browser }) => {
  test.setTimeout(420_000);
  const host = await player(browser);
  const guest = await player(browser, true);

  await host.page.goto("/party");
  await host.page.getByLabel("Your name").fill("QA Bot Host");
  await host.page.getByRole("button", { name: "Create a room" }).click();
  await expect(host.page).toHaveURL(/\/party\/[A-HJ-NP-Z2-9]{6}$/, { timeout: 20_000 });
  const code = host.page.url().split("/").pop()!;

  await guest.page.goto(`/party/${code}`);
  await guest.page.getByLabel("Your name").fill("QA Bot Guest");
  await guest.page.getByRole("button", { name: "Join the crew" }).click();
  await expect(host.page.getByText("QA Bot Guest")).toBeVisible({ timeout: 20_000 });
  await guest.page.getByRole("button", { name: "I'm ready" }).click();
  await expect(host.page.getByRole("button", { name: "Launch the game" })).toBeEnabled({ timeout: 20_000 });
  await host.page.getByRole("button", { name: "Launch the game" }).click();

  const names = ["Pattern Break", "Truth Trap", "Timeline", "GeoTap", "Final Bet"];
  for (let i = 0; i < 5; i++) {
    await Promise.all([waitForRound(host.page, i), waitForRound(guest.page, i)]);
    await answerBlind(host.page, i);
    if (i === 2) await guest.page.reload(); // reconnect mid-game keeps the seat
    if (i === 2) await waitForRound(guest.page, i);
    await answerBlind(guest.page, i);
    await expect(host.page.getByRole("heading", { name: "Round results" })).toBeVisible({ timeout: 40_000 });
    await expect(guest.page.getByRole("heading", { name: "Round results" })).toBeVisible({ timeout: 40_000 });
    const skip = host.page.getByRole("button", { name: i < 4 ? `Continue to ${names[i + 1]}` : "Show final standings" });
    await skip.click({ timeout: 3_000 }).catch(() => {});
  }

  await expect(host.page.getByRole("list", { name: "Full ranking" })).toBeVisible({ timeout: 40_000 });
  await expect(guest.page.getByRole("list", { name: "Full ranking" })).toBeVisible({ timeout: 40_000 });
  expect(await host.page.getByRole("list", { name: "Full ranking" }).innerText()).toBe(await guest.page.getByRole("list", { name: "Full ranking" }).innerText());

  await host.page.getByRole("button", { name: "Rematch" }).click();
  await expect(guest.page.getByRole("heading", { name: "Room code" })).toBeVisible({ timeout: 20_000 });

  // Invalid code
  await guest.page.goto("/party/ZZZZZZ");
  await expect(guest.page.getByRole("heading", { name: "Room not found" })).toBeVisible({ timeout: 20_000 });

  for (const p of [host, guest]) {
    expect(p.w.bad, "no server errors").toEqual([]);
    expect(p.w.errors, "no console errors").toEqual([]);
  }
});
