import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "accounts.spec.ts",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5187",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined,
    viewport: { width: 1440, height: 1050 },
  },
  webServer: [
    {
      command: "npm run server",
      url: "http://127.0.0.1:3187/api/health",
      env: {
        FINANCE_API_PORT: "3187",
        FINANCE_APP_ORIGIN: "http://127.0.0.1:5187",
        FINANCE_DB: `.data/e2e-${Date.now()}.sqlite`,
      },
      reuseExistingServer: false,
    },
    {
      command: "npx vite --host 127.0.0.1 --port 5187 --strictPort",
      url: "http://127.0.0.1:5187",
      env: {
        VITE_FINANCE_API: "1",
        FINANCE_API_TARGET: "http://127.0.0.1:3187",
      },
      reuseExistingServer: false,
    },
  ],
});
