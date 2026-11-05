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

// Priorities (DNR: a higher value wins, one rule per request). All must outrank
// the static tag removal rule (priority 1) so aggressive cleaning wins, but stay
// below the cart add rule (priority 10) and the allow rules (priority 100). The
// product rules must outrank the url rule so a slugged product URL is
// canonicalized in one redirect.
const AGGRESSIVE_URL_RULE_PRIORITY = 5;
const AGGRESSIVE_PRODUCT_RULE_PRIORITY = 6;

// The replacement tag rule must outrank the static tag removal rule (priority 1)
// but stay below the aggressive rules: aggressive mode cleans the URL first, the
// replacement rule then adds the tag to the cleaned URL, and the allow rule for
// the replacement tag (ALLOW_RULE_PRIORITY) stops any further redirect.
const REPLACEMENT_TAG_RULE_PRIORITY = 4;

// Must not collide with the allow rule ids (index * 2 + 1 and index * 2 + 2)
const AGGRESSIVE_SLUGGED_PRODUCT_RULE_ID = 100001;
const AGGRESSIVE_URL_RULE_ID = 100002;
const AGGRESSIVE_BARE_PRODUCT_RULE_ID = 100003;
const REPLACEMENT_TAG_RULE_ID = 100004;
const REPLACEMENT_TAG_ALLOW_RULE_ID = 100005;

// Amazon tracking IDs look like "name-21"; restrict to URL-safe characters so the
// value can be used in a query parameter and a regexFilter without escaping issues.
const REPLACEMENT_TAG_PATTERN = /^[\w.~-]+$/u;

/** Returns the trimmed replacement tag, or an empty string when it is unset or invalid. */
export function normalizeReplacementTag(replacementTag: unknown): string {
  if (typeof replacementTag !== "string") {
    return "";
  }
  const trimmed = replacementTag.trim();
  return REPLACEMENT_TAG_PATTERN.test(trimmed) ? trimmed : "";
}

// Amazon serves a product by its canonical `/dp/<ASIN>`; the title slug and the
// `/gp/product/` / `/product/` shapes are cosmetic. Real ASINs are 10
// characters (B...) or 13 digits (ISBN); the slugged rule uses the unbounded
// class and the bare rule a lower bound because a bounded `{9,13}` class
// exceeds the RE2 budget (see below). A product-shaped URL with a short
// segment just canonicalizes to a 404 product page, which is harmless.
const ASIN = "[A-Z0-9]+";
const ASIN_BOUNDED = "[A-Z0-9]{9,}";

const AMAZON_HOST = "https?://(?:[a-z0-9-]+\\.)*amazon\\.[^/]+";

// Chrome DNR compiles each regexFilter with RE2 under a 2KB max_mem budget
// (forward Prog gets 2/3 of it) and rejects the whole updateDynamicRules call
// if any rule exceeds it. These filters are measured to compile within it, so
// keep them structurally minimal — no new alternations or bounded classes.
/** Aggressive-mode product rule: canonicalize the match to `host/dp/<ASIN>`. */
function createAggressiveProductRule(id: number, regexFilter: string): chrome.declarativeNetRequest.Rule {
  return {
    id,
    priority: AGGRESSIVE_PRODUCT_RULE_PRIORITY,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: "\\1/dp/\\2",
      },
    },
    condition: {
      regexFilter,
      resourceTypes: ["main_frame", "sub_frame"],
    },
  };
}

/**
 * Aggressive mode (opt-in, see GitHub issue #550), slugged product part:
 * canonicalize a product URL to the bare `https://.../dp/<ASIN>`, dropping the
 * title slug and the `/gp/product/` shape (the `/gp` segment counts as the
 * slug). `/.+?/` requires a slug before the shape, so an already-canonical
 * `/dp/<ASIN>` does not match (no no-op redirect); those are cleaned by
 * createAggressiveUrlRule instead. Any trailing `/ref=...` segment and query
 * are consumed by the trailing `.*`.
 */
export function createAggressiveSluggedProductRule(): chrome.declarativeNetRequest.Rule {
  return createAggressiveProductRule(AGGRESSIVE_SLUGGED_PRODUCT_RULE_ID, `^(${AMAZON_HOST})(?:/.+?/(?:dp|product)/)(${ASIN}).*`);
}

/**
 * Bare product part: canonicalize a slug-less `/product/<ASIN>` URL. Kept
 * separate from the slugged rule because the combined filter exceeds the RE2
 * 2KB budget.
 */
export function createAggressiveBareProductRule(): chrome.declarativeNetRequest.Rule {
  return createAggressiveProductRule(AGGRESSIVE_BARE_PRODUCT_RULE_ID, `^(${AMAZON_HOST})/product/(${ASIN_BOUNDED}).*`);
}

/**
 * Aggressive mode, URL part: strips every query parameter and a trailing
 * `/ref=...` path segment from the remaining Amazon URLs (non-product pages,
 * and already-canonical `/dp/<ASIN>` URLs that still carry a query or ref
 * segment). The substitution keeps only group 1 (scheme, host and path without
 * the ref segment and query). The filter only matches when there is something
 * to strip, so unmarked URLs are never redirected.
 */
export function createAggressiveUrlRule(): chrome.declarativeNetRequest.Rule {
  return {
    id: AGGRESSIVE_URL_RULE_ID,
    priority: AGGRESSIVE_URL_RULE_PRIORITY,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: "\\1",
      },
    },
    condition: {
      regexFilter: `^((${AMAZON_HOST})(/.+?))(?:/ref=[^/]*|\\?.+)$`,
      resourceTypes: ["main_frame", "sub_frame"],
    },
  };
}

/** The three dynamic DNR rules that make up aggressive mode. */
export function createAggressiveRules(): chrome.declarativeNetRequest.Rule[] {
  return [createAggressiveSluggedProductRule(), createAggressiveBareProductRule(), createAggressiveUrlRule()];
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

/**
 * Replacement tag (GitHub issue #11): instead of just removing the foreign tag,
 * set the user's own tag on every Amazon page navigation. Two rules work
 * together to avoid a redirect loop: the redirect rule sets `tag` (replacing a
 * foreign one, dropping `ascsubtag`), and the allow rule leaves any URL that
 * already carries the replacement tag untouched. The allow rule uses the same
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
    {
      id: REPLACEMENT_TAG_ALLOW_RULE_ID,
      priority: ALLOW_RULE_PRIORITY,
      action: {
        type: "allow",
      },
      condition: {
        regexFilter: `^${AMAZON_HOST}/.*[?&]tag=${escapedTag}(?:[&#]|$)`,
        resourceTypes: ["main_frame", "sub_frame"],
      },
    },
  ];
}

export async function updateRules(allowedTags: string[], aggressiveMode = false, replacementTag = ""): Promise<void> {
  try {
    const existingRules = await browser.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((rule) => rule.id);
    const normalizedReplacementTag = normalizeReplacementTag(replacementTag);
    const addRules = [
      ...createAmazonRules(allowedTags),
      ...(aggressiveMode ? createAggressiveRules() : []),
      ...(normalizedReplacementTag ? createReplacementTagRules(normalizedReplacementTag) : []),
    ];
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

    const { aggressiveMode, allowedTags, replacementTag } = await storage.get(["aggressiveMode", "allowedTags", "replacementTag"]);
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

    if (aggressiveMode === true && !hasAllowedTag && !isCartAdd) {
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
    void storage.set({
      disableNotifications: false,
      allowedTags: [],
      aggressiveMode: false,
      replacementTag: "",
    });
  }

  const result = await storage.get(["allowedTags", "aggressiveMode", "replacementTag"]);
  await updateRules((result.allowedTags as string[]) || [], result.aggressiveMode === true, normalizeReplacementTag(result.replacementTag));
});

browser.storage.onChanged.addListener(async (changes) => {
  if (changes.allowedTags || changes.aggressiveMode || changes.replacementTag) {
    // Re-read all options so the rule set always reflects the current
    // combination of allowed tags, aggressive mode and replacement tag
    const { allowedTags, aggressiveMode, replacementTag } = await storage.get(["allowedTags", "aggressiveMode", "replacementTag"]);
    await updateRules((allowedTags as string[]) || [], aggressiveMode === true, normalizeReplacementTag(replacementTag));
  }
});
