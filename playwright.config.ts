import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {}

// Happy-path check in a real browser at phone width, against the staging Supabase project.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 1,
  use: {
    ...devices["Pixel 5"],
    viewport: { width: 360, height: 780 },
    baseURL: "http://localhost:3125",
    trace: "retain-on-failure",
  },
  webServer: { command: "npx next dev -p 3125", url: "http://localhost:3125/login", reuseExistingServer: true, timeout: 120_000 },
});
