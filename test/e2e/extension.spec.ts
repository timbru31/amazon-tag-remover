import { expect, test } from "./fixtures.js";
import { getDynamicRules, getStorage, setStorage } from "./helpers.js";

test("service worker seeds default storage on install", async ({ serviceWorker }) => {
  await expect
    .poll(() => getStorage(serviceWorker), { timeout: 10_000 })
    .toEqual({
      aggressiveMode: false,
      allowedTags: [],
      disableNotifications: false,
      replacementTag: "",
    });
});

test("allowed tags are registered as dynamic allow rules", async ({ serviceWorker }) => {
  await setStorage(serviceWorker, { allowedTags: ["keepme"] });
  await expect
    .poll(async () => (await getDynamicRules(serviceWorker)).map((rule) => rule.condition.regexFilter), { timeout: 10_000 })
    .toContainEqual(expect.stringContaining("tag=keepme"));
});
