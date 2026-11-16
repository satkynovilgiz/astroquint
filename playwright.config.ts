import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  // prod-*.spec.ts run against the live site via playwright.prod.config.ts
  testIgnore: /prod-.*\.spec\.ts/,
  fullyParallel: true,
  // Games are real-time (20s rounds): too many parallel browsers starve the CPU
  // and turn timing into flakiness, so cap concurrency.
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Tests run against the production build: `npm run build` first.
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // Test-only secret so the production server can sign guest sessions.
    env: { SESSION_SECRET: process.env.SESSION_SECRET ?? "e2e-only-secret-not-for-production-use-0123456789" },
    timeout: 60_000,
  },
});
