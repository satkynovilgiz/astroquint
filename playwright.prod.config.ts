import { defineConfig, devices } from "@playwright/test";
// Runs selected specs against the live deployment (no local server).
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /prod-.*\.spec\.ts/,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.PROD_URL ?? "https://astroquint.vercel.app", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
