import { expect, test } from "@playwright/test";

const jsonError = (status: number, code: string, message: string) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify({ error: { code, message, requestId: "test123" } }),
});

test.describe("honest error handling (regression for production 'Something went wrong')", () => {
  test("Solo shows a specific message and recovers via Try again", async ({ page }) => {
    let fail = true;
    await page.route("**/api/solo/start", (route) =>
      fail ? route.fulfill(jsonError(503, "session_secret_missing", "The game server isn't fully set up yet, so games can't start right now. Please try again later.")) : route.continue(),
    );
    await page.goto("/play/solo");
    await page.getByRole("button", { name: "Launch solo run" }).click();
    const alert = page.getByRole("alert").filter({ hasText: "Games are temporarily unavailable" });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Ref: session_secret_missing · test123");
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
    fail = false;
    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("button", { name: "Start Pattern Break" })).toBeVisible();
  });

  test("Solo explains network failures", async ({ page }) => {
    await page.route("**/api/solo/start", (route) => route.abort("internetdisconnected"));
    await page.goto("/play/solo");
    await page.getByRole("button", { name: "Launch solo run" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Connection problem" })).toContainText("Unable to start your game. Check your connection");
  });

  test("Daily explains a missing database and points to Solo", async ({ page }) => {
    await page.route("**/api/daily", (route) => route.fulfill(jsonError(503, "storage_not_configured", "This mode needs Astroquint's online database, which isn't connected yet. Solo Orbit works without it.")));
    await page.goto("/daily");
    const alert = page.getByRole("alert").filter({ hasText: "Online play isn't connected yet" });
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("link", { name: "Play Solo Orbit instead" })).toHaveAttribute("href", "/play/solo");
  });

  test("Party says up front when rooms aren't available", async ({ page }) => {
    await page.route("**/api/health", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, modes: { solo: true, daily: false, party: false }, checks: { sessionSecret: "set", storage: "not_configured", database: "not_configured", realtime: "sse" } }),
      }),
    );
    await page.goto("/party");
    await expect(page.getByRole("alert").filter({ hasText: "Party Mode isn't online yet" })).toBeVisible();
  });

  test("Party create reports the real failure", async ({ page }) => {
    await page.route("**/api/party", (route) => route.abort("internetdisconnected"));
    await page.goto("/party");
    await page.getByLabel("Your name").fill("Tester");
    await page.getByRole("button", { name: "Create a room" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Could not create a room. Check your connection and try again." })).toBeVisible();
  });

  test("health endpoint reports configuration without secrets", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.modes).toEqual({ solo: true, daily: true, party: true });
    expect(JSON.stringify(body)).not.toMatch(/e2e-only-secret/);
  });
});
