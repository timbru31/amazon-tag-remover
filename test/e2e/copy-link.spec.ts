import { expect, test } from "./fixtures.js";
import { AMAZON_URL } from "./helpers.js";

// The Chromium context menu is browser UI, unreachable from the page in a
// headless browser, so these tests verify the browser-specific dependencies of
// the "Copy link without tracking tag" feature instead: the contextMenus and
// clipboardWrite manifest permissions must be effective in the real service
// worker (the click handler and sanitization logic are covered by the unit
// tests). clipboardWrite only exposes navigator.clipboard in service workers
// from Chrome 157 on, so the first test also pins the required browser floor.

test("service worker has clipboard write access", async ({ serviceWorker }) => {
  const writeTextType = await serviceWorker.evaluate(() => typeof navigator.clipboard?.writeText);
  expect(writeTextType).toBe("function");
});

test("service worker can write to the clipboard without a user gesture", async ({ context, page, serviceWorker }) => {
  // Read the clipboard from the fixture page (a secure context) with the
  // permission granted, because Playwright exposes no clipboard API of its own
  await context.grantPermissions(["clipboard-read"], { origin: "https://www.amazon.de" });
  await page.goto(AMAZON_URL, { waitUntil: "load" });
  const readClipboard = () => page.evaluate(() => navigator.clipboard.readText());
  await serviceWorker.evaluate((url) => navigator.clipboard.writeText(url), AMAZON_URL);
  await expect.poll(readClipboard, { timeout: 10_000 }).toBe(AMAZON_URL);
});

test("service worker can create context menu items", async ({ serviceWorker }) => {
  // create() rejects when the contextMenus permission is missing from the manifest
  await serviceWorker.evaluate(async () => {
    await browser.contextMenus.create({ id: "e2e-probe-item", title: "E2E probe", contexts: ["link"] });
    await browser.contextMenus.remove("e2e-probe-item");
  });
});
