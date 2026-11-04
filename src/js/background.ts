import { storage } from "./api.js";

// Keep in sync with the host_permissions in src/manifest.json
const amazonDomains = [
  "ae",
  "at",
  "ca",
  "ch",
  "cn",
  "co.jp",
  "co.uk",
  "co.za",
  "com.au",
  "com.be",
  "com.br",
  "com.mx",
  "com.sg",
  "com.tr",
  "com",
  "de",
  "dk",
  "eg",
  "es",
  "fr",
  "ie",
  "in",
  "it",
  "mx",
  "nl",
  "nz",
  "pl",
  "pt",
  "sa",
  "se",
  "sg",
  "us",
];

// Unified event filter (Chrome 148+ / Firefox 140+): urlMatches uses RE2.
// ([a-z0-9-]+\.)* requires a dotted subdomain label (or none) before "amazon"
// so hosts like m.media-amazon.com do not match, while www.amazon.de and
// amazon.de do.
const amazonUrlFilter = {
  url: [{ urlMatches: `^https?://([a-z0-9-]+\\.)*amazon\\.(${amazonDomains.join("|")})/` }],
};

export function createAmazonRules(allowedTags: string[]): chrome.declarativeNetRequest.Rule[] {
  return allowedTags.flatMap((tag, index) => {
    const escapedTag = tag.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return [
      {
        id: index * 2 + 1,
        priority: 1,
        action: {
          type: "allow",
        },
        condition: {
          regexFilter: `^https?://[^/]*amazon\\.[^/]+/.*[?&]tag=${escapedTag}.*`,
          resourceTypes: ["main_frame", "sub_frame"],
        },
      },
      {
        id: index * 2 + 2,
        priority: 1,
        action: {
          type: "allow",
        },
        condition: {
          regexFilter: `^https?://[^/]*amazon\\.[^/]+/.*[?&]ascsubtag=${escapedTag}.*`,
          resourceTypes: ["main_frame", "sub_frame"],
        },
      },
    ];
  });
}

export async function updateRules(allowedTags: string[]): Promise<void> {
  try {
    const existingRules = await browser.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);
    const addRules = createAmazonRules(allowedTags);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  } catch (error) {
    console.error("Error updating rules:", error);
  }
}

browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
  try {
    const { tabId, url } = details;
    const parsedUrl = new URL(url);

    // getAll() covers repeated params (e.g. ?tag=a&tag=b) and dedupe so a value
    // present in both tag and ascsubtag is only listed once. removeParams in
    // rules.json strips every occurrence, so this mirrors what actually happens.
    const removedTags = [...new Set([...parsedUrl.searchParams.getAll("tag"), ...parsedUrl.searchParams.getAll("ascsubtag")])];

    const removedTagsKey = `removedTags-${tabId}`;
    if (removedTags.length > 0) {
      await storage.set({ [removedTagsKey]: removedTags });
    } else {
      // Clear any stale value left over from a previous navigation in this tab
      await storage.remove(removedTagsKey);
    }
  } catch (error) {
    console.error("Error storing removed tags:", error);
  }
}, amazonUrlFilter);

browser.webNavigation.onCompleted.addListener(async (details) => {
  try {
    const removedTagsKey = `removedTags-${details.tabId}`;
    const { [removedTagsKey]: removedTags } = (await storage.get(removedTagsKey)) as Record<string, string[]>;

    // Always clean up so keys never accumulate in sync storage
    await storage.remove(removedTagsKey);

    if (!removedTags?.length) {
      return;
    }

    const { disableNotifications } = await storage.get("disableNotifications");
    if (disableNotifications) {
      return;
    }

    const { allowedTags } = (await storage.get("allowedTags")) as Record<string, string[]>;
    const filteredRemovedTags = removedTags.filter((tag) => !allowedTags?.includes(tag));

    if (filteredRemovedTags.length > 0 && browser.notifications) {
      await browser.notifications.create("amazonTagRemoverNotification", {
        iconUrl: browser.runtime.getURL("images/icon64.png"),
        message: `The following tracking tags have been removed: ${filteredRemovedTags.join(", ")}`,
        title: "Tag Remover for Amazon",
        type: "basic",
      });
    }
  } catch (error) {
    console.error("Error handling navigation event:", error);
  }
}, amazonUrlFilter);

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    void storage.set({
      disableNotifications: false,
      allowedTags: [],
    });
  }

  const result = await storage.get("allowedTags");
  await updateRules((result.allowedTags as string[]) || []);
});

browser.storage.onChanged.addListener(async (changes) => {
  if (changes.allowedTags) {
    await updateRules((changes.allowedTags.newValue as string[]) || []);
  }
});
