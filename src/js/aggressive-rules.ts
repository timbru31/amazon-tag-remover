// Priorities (DNR: a higher value wins, one rule per request). All must outrank
// the static tag removal rule (priority 1) so aggressive cleaning wins, but stay
// below the cart add rule (priority 10) and the allow rules (priority 100). The
// product rules must outrank the url rule so a slugged product URL is
// canonicalized in one redirect.
const AGGRESSIVE_URL_RULE_PRIORITY = 5;
const AGGRESSIVE_PRODUCT_RULE_PRIORITY = 6;

// Must not collide with the ids in background.ts and region-redirect.ts
const AGGRESSIVE_SLUGGED_PRODUCT_RULE_ID = 100001;
const AGGRESSIVE_URL_RULE_ID = 100002;
const AGGRESSIVE_BARE_PRODUCT_RULE_ID = 100003;
const AGGRESSIVE_PRODUCT_SHAPE_RULE_ID = 100007;
const AGGRESSIVE_REF_RULE_ID = 100008;

// Amazon serves a product by its canonical `/dp/<ASIN>`; the title slug and the
// `/gp/product/` / `/product/` shapes are cosmetic. Real ASINs are 10
// characters (B...) or 13 digits (ISBN); the slugged rules use the unbounded
// class and the bare rule a lower bound because a bounded `{9,13}` class
// exceeds the RE2 budget (see below). A product-shaped URL with a short
// segment just canonicalizes to a 404 product page, which is harmless.
const ASIN = "[A-Z0-9]+";
const ASIN_BOUNDED = `${"[A-Z0-9]".repeat(9)}[A-Z0-9]*`;

// Capture groups: the surrounding rule wraps this in group 1 (scheme + host),
// this contributes group 2 (the optional subdomain), so the ASIN is group 3.
export const AMAZON_HOST = "https?://([^/]*\\.)?amazon\\.[^/]+";

// Safari compiles regexFilter with WebKit's content blocker parser, which
// rejects alternation (`|`), `{n,m}` repetition and built-in classes like
// `\w` or `\d` ("not a supported regular expression") and then rejects the
// whole updateDynamicRules call. All filters below therefore use only
// literals, `[...]` classes, `.`, `?`/`*`/`+` and capture groups, so that one
// rule shape means one rule (hence the separate dp/product and query/ref
// rules).
//
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
        regexSubstitution: "\\1/dp/\\3",
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
 * title slug. `/.+?/` requires a slug before `/dp/`, so an already-canonical
 * `/dp/<ASIN>` does not match (no no-op redirect); those are cleaned by
 * createAggressiveUrlRule instead. Any trailing `/ref=...` segment and query
 * are consumed by the trailing `.*`.
 */
export function createAggressiveSluggedProductRule(): chrome.declarativeNetRequest.Rule {
  return createAggressiveProductRule(AGGRESSIVE_SLUGGED_PRODUCT_RULE_ID, `^(${AMAZON_HOST})/.+?/dp/(${ASIN}).*`);
}

/**
 * Slugged `/product/` shape, e.g. `/gp/product/<ASIN>` (the `/gp` segment
 * counts as the slug). Separate from the `/dp/` rule because the combined
 * filter would need an alternation.
 */
export function createAggressiveProductShapeRule(): chrome.declarativeNetRequest.Rule {
  return createAggressiveProductRule(AGGRESSIVE_PRODUCT_SHAPE_RULE_ID, `^(${AMAZON_HOST})/.+?/product/(${ASIN}).*`);
}

/** Bare product part: canonicalize a slug-less `/product/<ASIN>` URL. */
export function createAggressiveBareProductRule(): chrome.declarativeNetRequest.Rule {
  return createAggressiveProductRule(AGGRESSIVE_BARE_PRODUCT_RULE_ID, `^(${AMAZON_HOST})/product/(${ASIN_BOUNDED}).*`);
}

/**
 * Aggressive mode, URL part: strips the query from the remaining Amazon URLs
 * (non-product pages, and already-canonical `/dp/<ASIN>` URLs that still carry
 * a query). The substitution keeps only group 1 (scheme, host and path). The
 * filter only matches when there is a query to strip, so unmarked URLs are
 * never redirected.
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
      regexFilter: `^(${AMAZON_HOST}/[^?]+)\\?.+$`,
      resourceTypes: ["main_frame", "sub_frame"],
    },
  };
}

/**
 * Aggressive mode, ref part: strips a trailing `/ref=...` path segment
 * (including a query behind it). A URL with both a ref segment and a query may
 * match this and the url rule; either order ends at the same URL.
 */
export function createAggressiveRefRule(): chrome.declarativeNetRequest.Rule {
  return {
    id: AGGRESSIVE_REF_RULE_ID,
    priority: AGGRESSIVE_URL_RULE_PRIORITY,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: "\\1",
      },
    },
    condition: {
      regexFilter: `^(${AMAZON_HOST}/.+?)/ref=[^/]*$`,
      resourceTypes: ["main_frame", "sub_frame"],
    },
  };
}

/** The dynamic DNR rules that make up aggressive mode. */
export function createAggressiveRules(): chrome.declarativeNetRequest.Rule[] {
  return [
    createAggressiveSluggedProductRule(),
    createAggressiveProductShapeRule(),
    createAggressiveBareProductRule(),
    createAggressiveUrlRule(),
    createAggressiveRefRule(),
  ];
}
