import {defineConfig} from "@playwright/test";

export default defineConfig({
  testDir: "./test/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173/novices-graph/",
    viewport: {width: 1440, height: 1100},
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/serve-built.js",
    url: "http://127.0.0.1:4173/novices-graph/",
    reuseExistingServer: !process.env.CI
  }
});
