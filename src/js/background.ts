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

// Priority of the allow rules for user-configured allowed tags. DNR evaluates
// rule priority before the action type, so these rules must outrank every
// redirect rule in rules.json (highest is the cart add rule with priority 10)
// to keep an allowed tag unmodified — including on endpoints that neutralize
// the tag instead of removing it.
const ALLOW_RULE_PRIORITY = 100;

// Priority of the aggressive-mode rule: it must outrank the static tag
// removal rule (priority 1) so that aggressive cleaning wins, but stay below
// the cart add neutralization rule (priority 10) so that endpoint keeps its
// parameters, and below the allow rules (ALLOW_RULE_PRIORITY) so an allowed
// tag always leaves a URL untouched.
const AGGRESSIVE_RULE_PRIORITY = 5;

// Must not collide with the allow rule ids (index * 2 + 1 and index * 2 + 2)
const AGGRESSIVE_RULE_ID = 100001;

/**
 * Aggressive mode (opt-in, see GitHub issue #550): strips every query
 * parameter and a trailing `/ref=...` path segment from Amazon URLs, leaving
 * e.g. https://www.amazon.com/dp/B00WMKUUAQ. The substitution keeps only the
 * prefix captured by group 1 (scheme, host and path without the ref segment
 * and query). The filter only matches when there is actually something to
 * clean, so unmarked URLs are never redirected.
 */
export function createAggressiveRule(): chrome.declarativeNetRequest.Rule {
  return {
    id: AGGRESSIVE_RULE_ID,
    priority: AGGRESSIVE_RULE_PRIORITY,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: "\\1",
      },
    },
    condition: {
      regexFilter: "^((https?://(?:[a-z0-9-]+\\.)*amazon\\.[^/]+)(/.+?))(?:/ref=[^/?]+\\?.+|/ref=[^/?]+|\\?.+)$",
      resourceTypes: ["main_frame", "sub_frame"],
    },
  };
}

export function createAmazonRules(allowedTags: string[]): chrome.declarativeNetRequest.Rule[] {
  return allowedTags.flatMap((tag, index) => {
    const escapedTag = tag.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return [
      {
        id: index * 2 + 1,
        priority: ALLOW_RULE_PRIORITY,
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
        priority: ALLOW_RULE_PRIORITY,
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

export async function updateRules(allowedTags: string[], aggressiveMode = false): Promise<void> {
  try {
    const existingRules = await browser.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);
    const addRules = [...createAmazonRules(allowedTags), ...(aggressiveMode ? [createAggressiveRule()] : [])];
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  } catch (error) {
    console.error("Error updating rules:", error);
  }
}

/** True when the path ends with a `/ref=...` segment, as produced by Amazon referrals. */
export function hasTrailingRefSegment(pathname: string): boolean {
  return /\/ref=[^/?]+$/u.test(pathname);
}

browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
  try {
    const { tabId, url } = details;
    const parsedUrl = new URL(url);

    // getAll() covers repeated params (e.g. ?tag=a&tag=b) and dedupe so a value
    // present in both tag and ascsubtag is only listed once. removeParams in
    // rules.json strips every occurrence, so this mirrors what actually happens.
    const removedTags = [...new Set([...parsedUrl.searchParams.getAll("tag"), ...parsedUrl.searchParams.getAll("ascsubtag")])];

    const { aggressiveMode, allowedTags } = await storage.get(["aggressiveMode", "allowedTags"]);
    const allowedTagList = (allowedTags as string[] | undefined) ?? [];
    // The allow rules (highest priority) leave a URL carrying an allowed tag
    // completely untouched, so no aggressive cleaning happens for it either.
    const hasAllowedTag = removedTags.some((tag) => allowedTagList.includes(tag));

    const removedTagsKey = `removedTags-${tabId}`;
    const aggressiveRemovedKey = `aggressiveRemoved-${tabId}`;
    // The cart add endpoint keeps its parameters (the static rule only
    // neutralizes the tag), so no aggressive cleaning happens there
    const isCartAdd = parsedUrl.pathname.includes("/gp/aws/cart/add.html");

    if (aggressiveMode === true && !hasAllowedTag && !isCartAdd) {
      // Mirrors createAggressiveRule: every query parameter and the trailing
      // /ref=... path segment are removed.
      const removedItems = [...new Set(parsedUrl.searchParams.keys())];
      if (hasTrailingRefSegment(parsedUrl.pathname)) {
        removedItems.push("ref");
      }
      if (removedItems.length > 0) {
        await storage.set({ [aggressiveRemovedKey]: removedItems });
      } else {
        // Clear any stale value left over from a previous navigation in this tab
        await storage.remove(aggressiveRemovedKey);
      }
      // The aggressive notification subsumes the regular one, since the tag
      // parameter is one of the removed query parameters
      await storage.remove(removedTagsKey);
    } else {
      if (removedTags.length > 0) {
        await storage.set({ [removedTagsKey]: removedTags });
      } else {
        // Clear any stale value left over from a previous navigation in this tab
        await storage.remove(removedTagsKey);
      }
      await storage.remove(aggressiveRemovedKey);
    }
  } catch (error) {
    console.error("Error storing removed tags:", error);
  }
}, amazonUrlFilter);

browser.webNavigation.onCompleted.addListener(async (details) => {
  try {
    const removedTagsKey = `removedTags-${details.tabId}`;
    const aggressiveRemovedKey = `aggressiveRemoved-${details.tabId}`;
    const { [removedTagsKey]: removedTags, [aggressiveRemovedKey]: aggressiveRemoved } = (await storage.get([
      removedTagsKey,
      aggressiveRemovedKey,
    ])) as Record<string, string[]>;

    // Always clean up so keys never accumulate in sync storage
    await storage.remove([removedTagsKey, aggressiveRemovedKey]);

    if (!removedTags?.length && !aggressiveRemoved?.length) {
      return;
    }

    const { disableNotifications } = await storage.get("disableNotifications");
    if (disableNotifications) {
      return;
    }

    let message: string | undefined;
    if (aggressiveRemoved?.length) {
      // Aggressive mode removed more than just the tag parameter, so list
      // everything that was stripped from the URL
      message = `The following tracking information has been removed (aggressive mode): ${aggressiveRemoved.join(", ")}`;
    } else {
      const { allowedTags } = (await storage.get("allowedTags")) as Record<string, string[]>;
      const filteredRemovedTags = (removedTags ?? []).filter((tag) => !allowedTags?.includes(tag));
      if (filteredRemovedTags.length > 0) {
        message = `The following tracking tags have been removed: ${filteredRemovedTags.join(", ")}`;
      }
    }

    if (message && browser.notifications) {
      await browser.notifications.create("amazonTagRemoverNotification", {
        iconUrl: browser.runtime.getURL("images/icon64.png"),
        message,
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
      aggressiveMode: false,
    });
  }

  const result = await storage.get(["allowedTags", "aggressiveMode"]);
  await updateRules((result.allowedTags as string[]) || [], result.aggressiveMode === true);
});

browser.storage.onChanged.addListener(async (changes) => {
  if (changes.allowedTags || changes.aggressiveMode) {
    // Re-read both options so the rule set always reflects the current
    // combination of allowed tags and aggressive mode
    const { allowedTags, aggressiveMode } = await storage.get(["allowedTags", "aggressiveMode"]);
    await updateRules((allowedTags as string[]) || [], aggressiveMode === true);
  }
});
