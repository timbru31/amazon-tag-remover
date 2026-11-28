import { describe, expect, it } from "vitest";

const region = await import("../src/js/region-redirect.js");
const { amazonDomains } = await import("../src/js/sanitize.js");

describe("normalizeRedirectRegion", () => {
  it("accepts known Amazon domains, case-insensitively and trimmed", () => {
    expect(region.normalizeRedirectRegion("de")).toBe("de");
    expect(region.normalizeRedirectRegion("  co.uk ")).toBe("co.uk");
    expect(region.normalizeRedirectRegion("FR")).toBe("fr");
  });

  it("rejects unset, empty, unknown and non-string values", () => {
    expect(region.normalizeRedirectRegion(undefined)).toBe("");
    expect(region.normalizeRedirectRegion("")).toBe("");
    expect(region.normalizeRedirectRegion("not-a-region")).toBe("");
    expect(region.normalizeRedirectRegion(42)).toBe("");
  });
});

describe("createRegionRedirectRules", () => {
  const rules = region.createRegionRedirectRules("de");

  it("has unique ids and a priority above the aggressive rules but below the cart add rule", () => {
    expect(new Set(rules.map((rule) => rule.id)).size).toBe(rules.length);
    expect(Math.min(...rules.map((rule) => rule.id))).toBeGreaterThan(100005);
    for (const rule of rules) {
      // One DNR redirect rule wins per request: with a region selected, the
      // regional redirect is the user's primary intent and must outrank the
      // aggressive (5, 6) and replacement tag (4) rules, while the cart add rule
      // (10) and the allow rules (100) keep their precedence.
      expect(rule.priority).toBe(9);
      expect(rule.action.type).toBe("redirect");
      expect(rule.condition.resourceTypes).toEqual(["main_frame", "sub_frame"]);
    }
  });

  it("rewrites the host to the target site and removes the tracking parameters", () => {
    for (const rule of rules) {
      expect(rule.action.redirect?.transform).toEqual({
        host: "www.amazon.de",
        queryTransform: { removeParams: ["tag", "ascsubtag"] },
      });
    }
  });

  it("has one regex-free rule per other regional site and none for the target", () => {
    const filters = rules.map((rule) => rule.condition.urlFilter);
    expect(filters).toHaveLength(amazonDomains.length - 1);
    expect(filters).toContain("||amazon.com/");
    expect(filters).toContain("||amazon.co.uk/");
    expect(filters).not.toContain("||amazon.de/");
    expect(rules.every((rule) => rule.condition.regexFilter === undefined)).toBe(true);
  });
});

describe("regionRedirectApplies", () => {
  it("is true for Amazon hosts other than the target region", () => {
    expect(region.regionRedirectApplies("www.amazon.com", "de")).toBe(true);
    expect(region.regionRedirectApplies("smile.amazon.fr", "de")).toBe(true);
    expect(region.regionRedirectApplies("amazon.co.jp", "de")).toBe(true);
  });

  it("is false for the target region, non-Amazon hosts and an unset region", () => {
    expect(region.regionRedirectApplies("www.amazon.de", "de")).toBe(false);
    expect(region.regionRedirectApplies("www.example.com", "de")).toBe(false);
    expect(region.regionRedirectApplies("m.media-amazon.com", "de")).toBe(false);
    expect(region.regionRedirectApplies("www.amazon.com", "")).toBe(false);
  });
});
