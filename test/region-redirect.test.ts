import { describe, expect, it } from "vitest";

const region = await import("../src/js/region-redirect.js");

function regexOf(regexFilter: string | undefined): RegExp {
  return new RegExp(regexFilter ?? "");
}

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

describe("createRegionRedirectRule", () => {
  const rule = region.createRegionRedirectRule("de");

  it("has a fixed id and a priority above the aggressive rules but below the cart add rule", () => {
    expect(rule.id).toBe(100006);
    // One DNR redirect rule wins per request: with a region selected, the
    // regional redirect is the user's primary intent and must outrank the
    // aggressive (5, 6) and replacement tag (4) rules, while the cart add rule
    // (10) and the allow rules (100) keep their precedence.
    expect(rule.priority).toBe(9);
    expect(rule.priority).toBeGreaterThan(6);
    expect(rule.priority).toBeLessThan(10);
    expect(rule.action.type).toBe("redirect");
    expect(rule.condition.resourceTypes).toEqual(["main_frame", "sub_frame"]);
  });

  it("rewrites the host to the target site and removes the tracking parameters", () => {
    expect(rule.action.redirect?.transform).toEqual({
      host: "www.amazon.de",
      queryTransform: { removeParams: ["tag", "ascsubtag"] },
    });
  });

  it("matches Amazon URLs on every other regional site", () => {
    const regex = regexOf(rule.condition.regexFilter);
    expect(regex.test("https://www.amazon.com/dp/B001")).toBe(true);
    expect(regex.test("https://smile.amazon.fr/s?k=books&tag=aff1")).toBe(true);
    expect(regex.test("https://amazon.co.jp/gp/product/B001/ref=xx")).toBe(true);
    expect(regex.test("http://www.amazon.com.au/")).toBe(true);
  });

  it("does not match URLs already on the target site (no no-op redirect)", () => {
    const regex = regexOf(rule.condition.regexFilter);
    expect(regex.test("https://www.amazon.de/dp/B001")).toBe(false);
    expect(regex.test("https://smile.amazon.de/s?k=books")).toBe(false);
    expect(regex.test("https://www.amazon.de/dp/B001?tag=aff1")).toBe(false);
  });

  it("does not match non-Amazon or media-amazon hosts", () => {
    const regex = regexOf(rule.condition.regexFilter);
    expect(regex.test("https://www.example.com/dp/B001")).toBe(false);
    expect(regex.test("https://m.media-amazon.com/images/x.jpg")).toBe(false);
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
