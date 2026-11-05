import type { ServiceWorker } from "@playwright/test";

import { expect, test } from "./fixtures.js";
import { getStorage, setStorage } from "./helpers.js";

function extensionUrl(serviceWorker: ServiceWorker, path: string): string {
  return `chrome-extension://${new URL(serviceWorker.url()).host}${path}`;
}

test("options page restores saved options", async ({ serviceWorker, page }) => {
  await setStorage(serviceWorker, { allowedTags: ["tag-one", "tag-two"], disableNotifications: true });
  await page.goto(extensionUrl(serviceWorker, "/options.html"));
  await expect(page.locator("#disable-notifications")).toBeChecked();
  await expect(page.locator("#allowed-tags")).toHaveValue("tag-one\ntag-two");
});

test("options page saves options", async ({ serviceWorker, page }) => {
  await page.goto(extensionUrl(serviceWorker, "/options.html"));
  await page.locator("#disable-notifications").check();
  await page.locator("#allowed-tags").fill("new-tag");
  await page.locator(".submit-button").click();
  await expect(page.locator(".checkmark")).toHaveClass(/visible/u);
  await expect
    .poll(() => getStorage(serviceWorker), { timeout: 10_000 })
    .toEqual({ aggressiveMode: false, allowedTags: ["new-tag"], disableNotifications: true });
});
