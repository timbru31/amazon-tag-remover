import { expect, test } from "./fixtures.js";
import { AMAZON_URL } from "./helpers.js";

// The toolbar popup itself is browser UI, so popup.html is opened as a regular
// tab. The popup reads the active tab, hence the page under test is brought to
// the front again after the popup tab has loaded.

test("popup copies the current Amazon URL without its tracking tag", async ({ context, page, serviceWorker }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://www.amazon.de" });
  await page.goto(AMAZON_URL, { waitUntil: "load" });
  // The DNR rule strips the tag on navigation; replaceState puts it back without one
  await page.evaluate(() => history.replaceState(null, "", "?tag=foo-21"));

  const popup = await context.newPage();
  await popup.goto(new URL("/popup.html", serviceWorker.url()).href);
  await page.bringToFront();
  await popup.locator("#copy").click();

  await expect(popup.locator("#status")).toHaveText("Copied without tracking tag.");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 10_000 }).toBe(AMAZON_URL);
});

test("popup refuses a non-Amazon page", async ({ context, page, serviceWorker }) => {
  await page.goto("about:blank");
  const popup = await context.newPage();
  await popup.goto(new URL("/popup.html", serviceWorker.url()).href);
  await page.bringToFront();
  await popup.locator("#copy").click();
  await expect(popup.locator("#status")).toHaveText("This is not an Amazon page.");
});
