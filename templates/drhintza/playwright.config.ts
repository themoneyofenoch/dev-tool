import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/*.spec.*"],
  timeout: 30_000,
  retries: 0,
  fullyParallel: false,

  webServer: {
    command: "npx vite preview --port 4173",
    port: 4173,
    reuseExistingServer: true,
    timeout: 30_000,
  },

  use: {
    baseURL: "http://localhost:4173",
    headless: true,
    viewport: { width: 375, height: 812 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
