import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 4300);
const SANDBOX_PORT = PORT + 1;

// The env files `next start` reads, so the sandbox suite sees keys from .env.local.
loadEnvConfig(process.cwd());
/** Sandbox keys are set (and not pointed at production): only then does e2e/sandbox.spec.ts run. */
const hasSandboxKeys =
  !!process.env.AUTHORIZE_NET_API_LOGIN_ID?.trim() &&
  !!process.env.AUTHORIZE_NET_TRANSACTION_KEY?.trim() &&
  (process.env.AUTHORIZE_NET_ENV?.trim() || "sandbox") === "sandbox";

/**
 * End-to-end checks against the production build (`npm run test:e2e` builds first).
 * Uses the locally installed Google Chrome, so no Playwright browser download is needed;
 * set PW_CHANNEL=chromium after `npx playwright install chromium` to use the bundled one.
 *
 * The "stub" project always runs against a server forced onto the stub gateway.
 * The "sandbox" project (e2e/sandbox.spec.ts) gets its own server with the
 * Authorize.net sandbox keys, started only when those keys are set; otherwise
 * its tests skip themselves.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    channel: process.env.PW_CHANNEL ?? "chrome",
    headless: true,
  },
  projects: [
    { name: "stub", testIgnore: /sandbox\.spec\.ts/, use: { baseURL: `http://localhost:${PORT}` } },
    { name: "sandbox", testMatch: /sandbox\.spec\.ts/, use: { baseURL: `http://localhost:${SANDBOX_PORT}` } },
  ],
  webServer: [
    {
      command: `npm run start -- -p ${PORT}`,
      // `next start` is a production runtime, where the stub gateway is refused unless explicitly allowed.
      // Empty keys keep this server on the stub even when .env.local has sandbox keys
      // (Next.js does not override variables that are already set).
      env: { PAYMENTS_ALLOW_STUB: "1", AUTHORIZE_NET_API_LOGIN_ID: "", AUTHORIZE_NET_TRANSACTION_KEY: "" },
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    ...(hasSandboxKeys
      ? [
          {
            command: `npm run start -- -p ${SANDBOX_PORT}`,
            env: { AUTHORIZE_NET_ENV: "sandbox", AUTHORIZE_NET_ALLOW_PRODUCTION: "" },
            url: `http://localhost:${SANDBOX_PORT}`,
            reuseExistingServer: false,
            timeout: 60_000,
          },
        ]
      : []),
  ],
});
