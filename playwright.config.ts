import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run their own dev server on port 3100 against the
// hoshimono_e2e database, reset and seeded before the server starts.
const PORT = 3100;
const E2E_DATABASE_URL = (process.env.E2E_DATABASE_URL ??=
  "postgresql://postgres:dev@localhost:5433/hoshimono_e2e");
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/warm-up.ts",
  fullyParallel: true,
  // The dev server compiles each route on first visit; give it time.
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: BASE_URL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Migrate, reset and seed hoshimono_e2e, then start: every run is fresh.
    command: `npx prisma migrate deploy && npx tsx e2e/reset-db.mts && npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      DIRECT_URL: E2E_DATABASE_URL,
      BETTER_AUTH_URL: BASE_URL,
      NEXT_PUBLIC_APP_URL: BASE_URL,
      E2E_MAILBOX: "1",
    },
  },
});
