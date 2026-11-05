import { expect, test } from "./fixtures.js";
import { AMAZON_URL, FIXTURE_TITLE, getDynamicRules, getNotificationCalls, installNotificationSpy, setStorage } from "./helpers.js";

// These tests exercise the real network stack: the DNR redirect rewrites the
// URL before the request leaves the browser, and the page that loads is the
// local fixture (see the title assertion), so they run fully offline.

test("removes tag and ascsubtag from amazon URLs", async ({ page }) => {
  await page.goto(`${AMAZON_URL}?tag=aff1&ascsubtag=asc1`, { waitUntil: "load" });
  expect(page.url()).toBe(AMAZON_URL);
  await expect(page).toHaveTitle(FIXTURE_TITLE);
});

test("keeps allowed tags", async ({ serviceWorker, page }) => {
  await setStorage(serviceWorker, { allowedTags: ["keepme"] });
  // The dynamic allow rule must be registered before the navigation happens.
  await expect.poll(async () => (await getDynamicRules(serviceWorker)).length, { timeout: 10_000 }).toBe(2);
  await page.goto(`${AMAZON_URL}?tag=keepme`, { waitUntil: "load" });
  expect(page.url()).toBe(`${AMAZON_URL}?tag=keepme`);
});

test("aggressive mode canonicalizes slugged product URLs in a real redirect", async ({ serviceWorker, page }) => {
  await setStorage(serviceWorker, { aggressiveMode: true });
  // The three aggressive dynamic rules must be registered before the navigation
  // happens. This also catches a regexFilter that exceeds Chrome's compiled
  // RE2 budget: such a rule rejects the whole updateDynamicRules call and the
  // redirect below would never fire.
  await expect.poll(async () => (await getDynamicRules(serviceWorker)).length, { timeout: 10_000 }).toBe(3);
  await page.goto(
    "https://www.amazon.de/benuta-Basic-Baumwollteppich-Ron-Minimalistisch/dp/B0DKK6BX9K/ref=sr_1_6_sspa?crid=3MOUWA4J839G7&keywords=teppich&qid=1793905131&tag=aff1",
    { waitUntil: "load" },
  );
  expect(page.url()).toBe("https://www.amazon.de/dp/B0DKK6BX9K");
  await expect(page).toHaveTitle(FIXTURE_TITLE);
});

test("notifies about removed tags", async ({ serviceWorker, page }) => {
  await installNotificationSpy(serviceWorker);
  await page.goto(`${AMAZON_URL}?tag=aff1`, { waitUntil: "load" });
  await expect
    .poll(() => getNotificationCalls(serviceWorker), { timeout: 10_000 })
    .toEqual([
      {
        id: "amazonTagRemoverNotification",
        options: expect.objectContaining({
          message: expect.stringContaining("aff1"),
          title: "Tag Remover for Amazon",
        }),
      },
    ]);
});

test("does not notify about allowed tags", async ({ serviceWorker, page }) => {
  await setStorage(serviceWorker, { allowedTags: ["aff1"] });
  await installNotificationSpy(serviceWorker);
  // The dynamic allow rule must be registered before the navigation happens.
  await expect.poll(async () => (await getDynamicRules(serviceWorker)).length, { timeout: 10_000 }).toBe(2);
  await page.goto(`${AMAZON_URL}?tag=aff1`, { waitUntil: "load" });
  expect(page.url()).toBe(`${AMAZON_URL}?tag=aff1`);
  // The onCompleted handler finishes its storage and notification logic well
  // within this window; "notifies about removed tags" guards against the
  // notification pipeline failing to fire at all.
  await page.waitForTimeout(1000);
  await expect(getNotificationCalls(serviceWorker)).resolves.toEqual([]);
});

test("does not notify when notifications are disabled", async ({ serviceWorker, page }) => {
  await setStorage(serviceWorker, { disableNotifications: true });
  await installNotificationSpy(serviceWorker);
  await page.goto(`${AMAZON_URL}?tag=aff1`, { waitUntil: "load" });
  expect(page.url()).toBe(AMAZON_URL);
  await page.waitForTimeout(1000);
  await expect(getNotificationCalls(serviceWorker)).resolves.toEqual([]);
});
