import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 4300);

/**
 * End-to-end checks against the production build (`npm run test:e2e` builds first).
 * Uses the locally installed Google Chrome, so no Playwright browser download is needed;
 * set PW_CHANNEL=chromium after `npx playwright install chromium` to use the bundled one.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.PW_CHANNEL ?? "chrome",
    headless: true,
  },
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
