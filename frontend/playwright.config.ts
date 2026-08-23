import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a real chain.
 *
 * There is no mocked RPC and no stubbed contract anywhere in this suite: it
 * points at a local Anvil devnet with the actual TIDE contracts deployed, and
 * every assertion is about state that a transaction really produced. The only
 * thing simulated is the wallet chooser, via wagmi's mock connector bound to a
 * devnet account — because automating a browser extension tests the extension,
 * not TIDE.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  // A transaction round trip plus a block is slower than a DOM assertion.
  timeout: 150_000,
  expect: { timeout: 20_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
});
