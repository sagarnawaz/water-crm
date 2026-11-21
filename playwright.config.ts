import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Happy-path check in a real browser at phone width, against the staging Supabase project.
// Next allows one dev server per folder: if `npm run dev` is already running, use E2E_PORT=3000.
const port = process.env.E2E_PORT ?? "3125";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 }, // first visit to a page compiles it in dev mode

  workers: 1,
  use: {
    ...devices["Pixel 5"],
    viewport: { width: 360, height: 780 },
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  webServer: { command: `npx next dev -p ${port}`, url: `http://localhost:${port}/login`, reuseExistingServer: true, timeout: 120_000 },
});
