import { amazonDomains } from "./sanitize.js";

// Regional redirect (GitHub issue #1535): when the user picks a target region,
// Amazon links from any other regional site are rewritten to the target site.
// One DNR redirect rule wins per request, so the rule outranks the aggressive
// (5, 6) and replacement tag (4) rules — with a region selected, the regional
// redirect is the user's primary intent and the rule itself removes the
// tracking tag (see createRegionRedirectRule). It stays below the cart add rule
// (priority 10), whose neutralized tag is required for the endpoint to work,
// and below the allow rules (priority 100), which keep allowed tags untouched.
// Aggressive cleaning and the replacement tag therefore still apply to links
// that are already on the target site.
const REGION_REDIRECT_RULE_PRIORITY = 9;

// One rule per source domain, with ids from this base on. Must not collide with
// the DNR rule ids in background.ts: the allow rule ids (index * 2 + 1 and
// index * 2 + 2 per allowed tag), the aggressive and replacement tag rule ids
// (100001..100008).
const REGION_REDIRECT_RULE_ID_BASE = 200000;

/** Returns the redirect region when it is a known Amazon domain, or "" when unset or unknown. */
export function normalizeRedirectRegion(redirectRegion: unknown): string {
  if (typeof redirectRegion !== "string") {
    return "";
  }
  const trimmed = redirectRegion.trim().toLowerCase();
  return amazonDomains.includes(trimmed) ? trimmed : "";
}

// Safari rejects the alternation of a single regexFilter ("not a supported
// regular expression"), so there is one urlFilter rule per source domain. The
// target domain gets no rule, so a URL already on the target site never matches
// (no no-op redirect). `||` anchors at a domain label (www.amazon.fr matches,
// m.media-amazon.com does not) and the trailing "/" ends the domain label.
/** Regional redirect rules (GitHub issue #1535): rewrite the host to the target site. */
export function createRegionRedirectRules(redirectRegion: string): chrome.declarativeNetRequest.Rule[] {
  return amazonDomains
    .filter((domain) => domain !== redirectRegion)
    .map((domain, index) => ({
      id: REGION_REDIRECT_RULE_ID_BASE + index,
      priority: REGION_REDIRECT_RULE_PRIORITY,
      action: {
        type: "redirect",
        redirect: {
          transform: {
            host: `www.amazon.${redirectRegion}`,
            queryTransform: {
              removeParams: ["tag", "ascsubtag"],
            },
          },
        },
      },
      condition: {
        urlFilter: `||amazon.${domain}/`,
        resourceTypes: ["main_frame", "sub_frame"],
      },
    }));
}

/** Mirrors the filters of createRegionRedirectRules: true when the host is an Amazon site other than the target. */
export function regionRedirectApplies(hostname: string, redirectRegion: string): boolean {
  if (!redirectRegion) {
    return false;
  }
  const match = /^(?:[a-z0-9-]+\.)*amazon\.([a-z0-9.]+)$/u.exec(hostname);
  const domain = match?.[1];
  return domain !== undefined && amazonDomains.includes(domain) && domain !== redirectRegion;
}
