import { storage } from "./api.js";
import { registerContextMenu } from "./context-menu.js";
import { AMAZON_HOST, createAggressiveRules } from "./aggressive-rules.js";
import { createRegionRedirectRules, normalizeRedirectRegion, regionRedirectApplies } from "./region-redirect.js";
import { amazonDomains, hasTrailingRefSegment, normalizeReplacementTag } from "./sanitize.js";

// The "Copy link without tracking tag" menu item; the click listener is
// attached by importing context-menu.js.
registerContextMenu();

export {
  createAggressiveBareProductRule,
  createAggressiveProductShapeRule,
  createAggressiveRefRule,
  createAggressiveRules,
  createAggressiveSluggedProductRule,
  createAggressiveUrlRule,
} from "./aggressive-rules.js";

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

// The replacement tag rule must outrank the static tag removal rule (priority 1)
// but stay below the aggressive rules: aggressive mode cleans the URL first, the
// replacement rule then adds the tag to the cleaned URL, and the allow rule for
// the replacement tag (ALLOW_RULE_PRIORITY) stops any further redirect.
const REPLACEMENT_TAG_RULE_PRIORITY = 4;

// Must not collide with the allow rule ids (index * 2 + 1 and index * 2 + 2) or the
// aggressive rule ids in aggressive-rules.ts (100001..100003, 100007, 100008)
const REPLACEMENT_TAG_RULE_ID = 100004;
const REPLACEMENT_TAG_ALLOW_RULE_ID = 100005;
const REPLACEMENT_TAG_ALLOW_END_RULE_ID = 100006;

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

/**
 * Replacement tag (GitHub issue #11): instead of just removing the foreign tag,
 * set the user's own tag on every Amazon page navigation. Two rules work
 * together to avoid a redirect loop: the redirect rule sets `tag` (replacing a
 * foreign one, dropping `ascsubtag`), and the allow rules (tag followed by `&`, `#` or the end; two rules because
 * Safari has no alternation) leave any URL that already carries the
 * replacement tag untouched. The allow rule uses the same
 * priority as the allowed tag rules, so it also outranks the redirect rule.
 */
export function createReplacementTagRules(replacementTag: string): chrome.declarativeNetRequest.Rule[] {
  const escapedTag = replacementTag.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return [
    {
      id: REPLACEMENT_TAG_RULE_ID,
      priority: REPLACEMENT_TAG_RULE_PRIORITY,
      action: {
        type: "redirect",
        redirect: {
          transform: {
            queryTransform: {
              addOrReplaceParams: [{ key: "tag", value: replacementTag }],
              removeParams: ["ascsubtag"],
            },
          },
        },
      },
      condition: {
        regexFilter: `^${AMAZON_HOST}/`,
        resourceTypes: ["main_frame", "sub_frame"],
      },
    },
    ...[
      { id: REPLACEMENT_TAG_ALLOW_RULE_ID, end: "[&#]" },
      { id: REPLACEMENT_TAG_ALLOW_END_RULE_ID, end: "$" },
    ].map(({ id, end }) => ({
      id,
      priority: ALLOW_RULE_PRIORITY,
      action: {
        type: "allow" as const,
      },
      condition: {
        regexFilter: `^${AMAZON_HOST}/.*[?&]tag=${escapedTag}${end}`,
        resourceTypes: ["main_frame", "sub_frame"] as chrome.declarativeNetRequest.ResourceType[],
      },
    })),
  ];
}

export async function updateRules(allowedTags: string[], aggressiveMode = false, replacementTag = "", redirectRegion = ""): Promise<void> {
  try {
    const existingRules = await browser.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);
    const normalizedReplacementTag = normalizeReplacementTag(replacementTag);
    const normalizedRedirectRegion = normalizeRedirectRegion(redirectRegion);
    const addRules = [
      ...createAmazonRules(allowedTags),
      ...(aggressiveMode ? createAggressiveRules() : []),
      ...(normalizedReplacementTag ? createReplacementTagRules(normalizedReplacementTag) : []),
      ...(normalizedRedirectRegion ? createRegionRedirectRules(normalizedRedirectRegion) : []),
    ];
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

    const { aggressiveMode, allowedTags, replacementTag, redirectRegion } = await storage.get([
      "aggressiveMode",
      "allowedTags",
      "replacementTag",
      "redirectRegion",
    ]);
    const allowedTagList = (allowedTags as string[] | undefined) ?? [];
    const normalizedReplacementTag = normalizeReplacementTag(replacementTag);
    if (normalizedReplacementTag) {
      // The user's own tag is never removed, see createReplacementTagRules
      allowedTagList.push(normalizedReplacementTag);
    }
    // The allow rules (highest priority) leave a URL carrying an allowed tag
    // completely untouched, so no aggressive cleaning happens for it either.
    const hasAllowedTag = removedTags.some((tag) => allowedTagList.includes(tag));

    const removedTagsKey = `removedTags-${tabId}`;
    const aggressiveRemovedKey = `aggressiveRemoved-${tabId}`;
    // The cart add endpoint keeps its parameters (the static rule only
    // neutralizes the tag), so no aggressive cleaning happens there
    const isCartAdd = parsedUrl.pathname.includes("/gp/aws/cart/add.html");
    // With a region selected, the regional redirect rule (higher priority) wins
    // over the aggressive rules and only removes the tag parameters, so the
    // aggressive notification must not claim anything more was stripped
    const isRegionRedirect = regionRedirectApplies(parsedUrl.hostname, normalizeRedirectRegion(redirectRegion));

    if (aggressiveMode === true && !hasAllowedTag && !isCartAdd && !isRegionRedirect) {
      // Mirrors createAggressiveUrlRule: every query parameter and the trailing
      // /ref=... path segment are removed. The product URL canonicalization done
      // by the aggressive product rules is cosmetic (not tracking info), so it is
      // not reported here.
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
      const { allowedTags, replacementTag } = await storage.get(["allowedTags", "replacementTag"]);
      const allowedTagList = (allowedTags as string[] | undefined) ?? [];
      const normalizedReplacementTag = normalizeReplacementTag(replacementTag);
      const filteredRemovedTags = (removedTags ?? []).filter((tag) => !allowedTagList.includes(tag) && tag !== normalizedReplacementTag);
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
    // Only fresh installs default to off; existing users keep their stored value (an unset key still means "on")
    await storage.set({
      disableNotifications: true,
      allowedTags: [],
      aggressiveMode: false,
      replacementTag: "",
      redirectRegion: "",
    });
  }

  const result = await storage.get(["allowedTags", "aggressiveMode", "replacementTag", "redirectRegion"]);
  await updateRules(
    (result.allowedTags as string[]) || [],
    result.aggressiveMode === true,
    normalizeReplacementTag(result.replacementTag),
    normalizeRedirectRegion(result.redirectRegion),
  );
});

browser.storage.onChanged.addListener(async (changes) => {
  if (changes.allowedTags || changes.aggressiveMode || changes.replacementTag || changes.redirectRegion) {
    // Re-read all options so the rule set always reflects the current
    // combination of allowed tags, aggressive mode, replacement tag and region
    const { allowedTags, aggressiveMode, replacementTag, redirectRegion } = await storage.get([
      "allowedTags",
      "aggressiveMode",
      "replacementTag",
      "redirectRegion",
    ]);
    await updateRules(
      (allowedTags as string[]) || [],
      aggressiveMode === true,
      normalizeReplacementTag(replacementTag),
      normalizeRedirectRegion(redirectRegion),
    );
  }
});
