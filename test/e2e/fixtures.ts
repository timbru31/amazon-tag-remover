import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect, test as base, type BrowserContext, type ServiceWorker } from "@playwright/test";

import { PORT } from "./global-setup.js";

const distDir = fileURLToPath(new URL("../../dist", import.meta.url));

// Waits for the extension's service worker. Checks the already-registered
// workers first so the wait never misses the event that fired before the
// listener was attached, and retries until the deadline so a slow machine
// degrades to a wait instead of a timeout.
async function waitForServiceWorker(context: BrowserContext): Promise<ServiceWorker> {
  const deadline = Date.now() + 30_000;
  for (;;) {
    const [existing] = context.serviceWorkers();
    if (existing) {
      return existing;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error("The extension service worker did not register");
    }
    await context.waitForEvent("serviceworker", { timeout: Math.min(remaining, 5_000) }).catch(() => {});
  }
}

// Boots the real, built extension in a throw-away headless profile.
// `channel: "chromium"` is required: Playwright's default headless shell is
// launched with --disable-extensions and would silently load nothing.
// `--host-rules` points www.amazon.de at the local TLS fixture started in
// global-setup.ts, so every test runs fully offline.
export const test = base.extend<{ serviceWorker: ServiceWorker }>({
  context: async ({}, use) => {
    const profileDir = await mkdtemp(join(tmpdir(), "tag-remover-e2e-"));
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      channel: "chromium",
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        `--host-rules=MAP www.amazon.de 127.0.0.1:${PORT}`,
        "--ignore-certificate-errors",
      ],
    });
    await use(context);
    await context.close();
    await rm(profileDir, { recursive: true, force: true });
  },
  serviceWorker: async ({ context }, use) => {
    await use(await waitForServiceWorker(context));
  },
});

export { expect };
