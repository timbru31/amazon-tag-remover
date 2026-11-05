import { defineConfig } from "@playwright/test";

// The e2e suite drives the real, built extension (dist/) in a headless Chrome
// for Testing profile while a local TLS fixture serves amazon.de offline —
// see test/e2e/ for the details.
export default defineConfig({
  testDir: "test/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./test/e2e/global-setup.ts",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // Each test boots its own browser with a fresh profile; a single worker
  // keeps the suite fast and avoids resource contention on CI runners.
  fullyParallel: false,
  workers: 1,
  retries: 0,
});
