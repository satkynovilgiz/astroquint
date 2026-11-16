import { expect, test, type Browser, type Page } from "@playwright/test";
import { answerBlind } from "./helpers";

const WORLD_ORDER = ["Pattern Break", "Truth Trap", "Timeline", "GeoTap", "Final Bet"];

async function newPlayer(browser: Browser, mobile = false): Promise<Page> {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true } : {});
  return ctx.newPage();
}

async function waitForQuestion(page: Page, i: number) {
  if (i === 4) {
    await expect(page.getByRole("heading", { name: "How much will you risk?" })).toBeVisible({ timeout: 20_000 });
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
  await expect(marker).toBeVisible({ timeout: 25_000 });
}

test.describe("party mode", () => {
  test.describe.configure({ timeout: 300_000 });

  test("two players play a synchronized five-world match and rematch", async ({ browser }) => {
    const host = await newPlayer(browser);
    const guest = await newPlayer(browser, true);

    // Host creates a room.
    await host.goto("/party");
    await host.getByLabel("Your name").fill("Captain");
    await host.getByRole("button", { name: "Create a room" }).click();
    await expect(host).toHaveURL(/\/party\/[A-HJ-NP-Z2-9]{6}$/);
    const code = host.url().split("/").pop()!;
    await expect(host.getByRole("button", { name: "Launch the game" })).toBeDisabled();

    // Guest follows the invite link and joins.
    await guest.goto(`/party/${code}`);
    await expect(guest.getByRole("heading", { name: `Join room ${code}` })).toBeVisible();
    await guest.getByLabel("Your name").fill("Rookie");
    await guest.getByRole("button", { name: "Join the crew" }).click();
    await expect(host.getByText("Rookie")).toBeVisible({ timeout: 10_000 }); // presence pushed to the host
    await guest.getByRole("button", { name: "I'm ready" }).click();
    await expect(host.getByRole("button", { name: "Launch the game" })).toBeEnabled({ timeout: 20_000 });
    await host.getByRole("button", { name: "Launch the game" }).click();

    for (let i = 0; i < 5; i++) {
      await Promise.all([waitForQuestion(host, i), waitForQuestion(guest, i)]);
      // Same question for both players.
      if (i === 0) {
        const hostSeq = await host.locator("ol[aria-label^='Sequence']").getAttribute("aria-label");
        const guestSeq = await guest.locator("ol[aria-label^='Sequence']").getAttribute("aria-label");
        expect(hostSeq).toBe(guestSeq);
      }
      await answerBlind(host, i);
      await expect(host.getByText(/Locked in\. Waiting for the crew/).or(host.getByRole("heading", { name: "Round results" }))).toBeVisible();
      if (i === 2) {
        // The guest drops and reconnects mid-game; their session keeps their seat.
        await guest.reload();
      }
      await answerBlind(guest, i);
      // Early reveal once both answered; at worst the round's own deadline (≤25s) reveals it.
      await expect(host.getByRole("heading", { name: "Round results" })).toBeVisible({ timeout: 30_000 });
      await expect(guest.getByRole("heading", { name: "Round results" })).toBeVisible({ timeout: 30_000 });
      // Host may skip the reveal; if it already auto-advanced (9s), that's fine too.
      const skipReveal = host.getByRole("button", { name: i < 4 ? `Continue to ${WORLD_ORDER[i + 1]}` : "Show final standings" });
      await skipReveal.click({ timeout: 3_000 }).catch(() => {});
    }

    await expect(host.getByRole("list", { name: "Full ranking" })).toBeVisible({ timeout: 15_000 });
    await expect(guest.getByRole("list", { name: "Full ranking" })).toBeVisible({ timeout: 15_000 });
    const hostRanking = await host.getByRole("list", { name: "Full ranking" }).innerText();
    const guestRanking = await guest.getByRole("list", { name: "Full ranking" }).innerText();
    expect(hostRanking).toBe(guestRanking);
    expect(hostRanking).toContain("Captain");
    expect(hostRanking).toContain("Rookie");

    await expect(guest.getByRole("button", { name: "Rematch" })).toHaveCount(0); // host-only control
    await host.getByRole("button", { name: "Rematch" }).click();
    await expect(host.getByRole("heading", { name: "Room code" })).toBeVisible();
    await expect(guest.getByRole("heading", { name: "Room code" })).toBeVisible({ timeout: 10_000 });
  });

  test("unknown rooms and bad codes are handled", async ({ page }) => {
    await page.goto("/party/ZZZZZZ");
    await expect(page.getByRole("heading", { name: "Room not found" })).toBeVisible();
    await page.goto("/party");
    await page.getByLabel("Your name").fill("Tester");
    await page.getByLabel("Room code").fill("OO0");
    await page.getByRole("button", { name: "Join" }).click();
    await expect(page.getByText(/Room codes are 6 letters/)).toBeVisible();
  });

  test("non-members can't act in a room", async ({ browser }) => {
    const host = await newPlayer(browser);
    await host.goto("/party");
    await host.getByLabel("Your name").fill("Captain");
    await host.getByRole("button", { name: "Create a room" }).click();
    await expect(host).toHaveURL(/\/party\/[A-Z0-9]{6}$/);
    const code = host.url().split("/").pop()!;
    const stranger = await newPlayer(browser);
    const res = await stranger.request.post(`/api/party/${code}/actions`, { data: { type: "start" } });
    expect(res.status()).toBe(403);
  });
});
