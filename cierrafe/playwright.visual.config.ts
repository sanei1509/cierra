import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./test-results/visual",
  fullyParallel: false,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    channel: "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3000",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-edge",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 } },
    },
    {
      name: "mobile-edge",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
});
