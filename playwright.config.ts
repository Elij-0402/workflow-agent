import { defineConfig, devices } from "@playwright/test";

const DEFAULT_BASE_URL = "http://127.0.0.1:3001";
const baseURL = process.env.E2E_BASE_URL?.trim() || DEFAULT_BASE_URL;
const useManagedServer = baseURL === DEFAULT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 10 * 60 * 1000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    browserName: "chromium",
    headless: process.env.CI ? true : process.env.PW_HEADLESS !== "false",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: useManagedServer
    ? {
        command: "npm run build && npm run start -- -p 3001",
        url: DEFAULT_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 10 * 60 * 1000,
      }
    : undefined,
});
