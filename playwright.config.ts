import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.FINANCE_TEST_ORIGIN || "http://127.0.0.1:5185",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined,
    viewport: { width: 1440, height: 1050 },
  },
  webServer: process.env.FINANCE_TEST_ORIGIN
    ? undefined
    : {
        command: "npm run preview -- --host 127.0.0.1 --port 5185 --strictPort",
        url: "http://127.0.0.1:5185",
        reuseExistingServer: !process.env.CI,
      },
});
