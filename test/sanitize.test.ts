import { describe, expect, it } from "vitest";
import { hasTrailingRefSegment, normalizeReplacementTag, sanitizeAmazonUrl, type SanitizeOptions } from "../src/js/sanitize.js";

const defaults: SanitizeOptions = { aggressiveMode: false, allowedTags: [], replacementTag: "" };

describe("normalizeReplacementTag", () => {
  it("trims valid tags", () => {
    expect(normalizeReplacementTag("  mytag-21 ")).toBe("mytag-21");
  });

  it("returns an empty string for unset or invalid tags", () => {
    expect(normalizeReplacementTag(undefined)).toBe("");
    expect(normalizeReplacementTag("")).toBe("");
    expect(normalizeReplacementTag("my tag")).toBe("");
    expect(normalizeReplacementTag("a&tag=b")).toBe("");
  });
});

describe("hasTrailingRefSegment", () => {
  it("detects a trailing /ref= segment", () => {
    expect(hasTrailingRefSegment("/Mitutoyo-Caliper/dp/B00WMKUUAQ/ref=as_li_ss_tl")).toBe(true);
    expect(hasTrailingRefSegment("/s/ref=nb_sb_noss")).toBe(true);
  });

  it("ignores ref segments that are not trailing or have no value", () => {
    expect(hasTrailingRefSegment("/dp/B001")).toBe(false);
    expect(hasTrailingRefSegment("/gp/aw/ref=xx/dp/B01")).toBe(false);
  });
});

describe("sanitizeAmazonUrl", () => {
  describe("normal mode", () => {
    it("removes the tag parameter", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/dp/B001?tag=googcana-20", defaults)).toEqual({
        url: "https://www.amazon.de/dp/B001",
        changed: true,
      });
    });

    it("removes the ascsubtag parameter", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/dp/B001?ascsubtag=asc1", defaults)).toEqual({
        url: "https://www.amazon.de/dp/B001",
        changed: true,
      });
    });

    it("removes repeated tag and ascsubtag occurrences and keeps other parameters", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/dp/B001?tag=a-20&tag=b-20&ascsubtag=c-20&ref=ox&crId=x", defaults)).toEqual({
        url: "https://www.amazon.de/dp/B001?ref=ox&crId=x",
        changed: true,
      });
    });

    it("leaves a tag-less URL unchanged", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/dp/B001?ref=ox", defaults)).toEqual({
        url: "https://www.amazon.de/dp/B001?ref=ox",
        changed: false,
      });
    });

    it("accepts http URLs", () => {
      expect(sanitizeAmazonUrl("http://www.amazon.de/dp/B001?tag=a-20", defaults)).toEqual({
        url: "http://www.amazon.de/dp/B001",
        changed: true,
      });
    });

    it("keeps a URL carrying an allowed tag completely untouched", () => {
      const input = "https://www.amazon.de/dp/B001?tag=keepme&tag=foreign-20";
      expect(sanitizeAmazonUrl(input, { ...defaults, allowedTags: ["keepme"] })).toEqual({ url: input, changed: false });
    });

    it("keeps a URL whose ascsubtag is allowed", () => {
      const input = "https://www.amazon.de/dp/B001?ascsubtag=keepme";
      expect(sanitizeAmazonUrl(input, { ...defaults, allowedTags: ["keepme"] })).toEqual({ url: input, changed: false });
    });

    it("replaces a foreign tag with the replacement tag", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/dp/B001?tag=foreign-20", { ...defaults, replacementTag: "mytag-21" })).toEqual({
        url: "https://www.amazon.de/dp/B001?tag=mytag-21",
        changed: true,
      });
    });

    it("replaces the foreign tag and drops ascsubtag when a replacement tag is set", () => {
      expect(
        sanitizeAmazonUrl("https://www.amazon.de/dp/B001?tag=foreign-20&ascsubtag=asc1&ref=ox", {
          ...defaults,
          replacementTag: "mytag-21",
        }),
      ).toEqual({
        url: "https://www.amazon.de/dp/B001?ref=ox&tag=mytag-21",
        changed: true,
      });
    });

    it("does not add the replacement tag to a URL without a foreign tag", () => {
      const input = "https://www.amazon.de/dp/B001?ref=ox";
      expect(sanitizeAmazonUrl(input, { ...defaults, replacementTag: "mytag-21" })).toEqual({ url: input, changed: false });
    });

    it("leaves a URL carrying only the replacement tag untouched", () => {
      const input = "https://www.amazon.de/dp/B001?tag=mytag-21";
      expect(sanitizeAmazonUrl(input, { ...defaults, replacementTag: "mytag-21" })).toEqual({ url: input, changed: false });
    });
  });

  describe("aggressive mode", () => {
    const aggressive: SanitizeOptions = { aggressiveMode: true, allowedTags: [], replacementTag: "" };

    it("removes every query parameter", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/dp/B001?tag=a-20&ref=ox&crId=x", aggressive)).toEqual({
        url: "https://www.amazon.de/dp/B001",
        changed: true,
      });
    });

    it("removes a trailing /ref= segment", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/dp/B001/ref=as_li_ss_tl?tag=a-20", aggressive)).toEqual({
        url: "https://www.amazon.de/dp/B001",
        changed: true,
      });
    });

    it("strips a trailing /ref= segment from a non-product page", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/s/ref=nb_sb_noss?tag=a-20", aggressive)).toEqual({
        url: "https://www.amazon.de/s",
        changed: true,
      });
    });

    it("leaves an already-clean URL unchanged", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/dp/B001", aggressive)).toEqual({
        url: "https://www.amazon.de/dp/B001",
        changed: false,
      });
    });

    it("replaces a foreign tag with the replacement tag after stripping the rest", () => {
      expect(
        sanitizeAmazonUrl("https://www.amazon.de/dp/B001?tag=foreign-20&ref=ox", { ...aggressive, replacementTag: "mytag-21" }),
      ).toEqual({
        url: "https://www.amazon.de/dp/B001?tag=mytag-21",
        changed: true,
      });
    });

    it("does not add the replacement tag to a URL without a foreign tag", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/dp/B001?ref=ox", { ...aggressive, replacementTag: "mytag-21" })).toEqual({
        url: "https://www.amazon.de/dp/B001",
        changed: true,
      });
    });

    it("drops a locale prefix before /dp/ together with the ref segment", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/-/en/dp/B09XN22JBT/ref=dp_ccx_cts_image_luxe_1", aggressive)).toEqual({
        url: "https://www.amazon.de/dp/B09XN22JBT",
        changed: true,
      });
    });

    it("canonicalizes a slugged product URL, dropping the slug and the ref segment", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/Mitutoyo-Caliper/dp/B00WMKUUAQ/ref=as_li_ss_tl", aggressive)).toEqual({
        url: "https://www.amazon.de/dp/B00WMKUUAQ",
        changed: true,
      });
    });

    it("canonicalizes a /gp/product/ slug to /dp/", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/gp/product/B00WMKUUAQ?tag=a-20", aggressive)).toEqual({
        url: "https://www.amazon.de/dp/B00WMKUUAQ",
        changed: true,
      });
    });

    it("canonicalizes a bare /product/ URL to /dp/", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/product/B00WMKUUAQ", aggressive)).toEqual({
        url: "https://www.amazon.de/dp/B00WMKUUAQ",
        changed: true,
      });
    });

    it("leaves a short bare /product/ segment alone", () => {
      const input = "https://www.amazon.de/product/abc";
      expect(sanitizeAmazonUrl(input, aggressive)).toEqual({ url: input, changed: false });
    });

    it("canonicalizes a clean slugged product URL even without tracking", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/-/en/dp/B09XN22JBT", aggressive)).toEqual({
        url: "https://www.amazon.de/dp/B09XN22JBT",
        changed: true,
      });
    });

    it("replaces a foreign tag with the replacement tag on a canonicalized product URL", () => {
      expect(
        sanitizeAmazonUrl("https://www.amazon.de/-/en/dp/B09XN22JBT?tag=foreign-20", {
          ...aggressive,
          replacementTag: "mytag-21",
        }),
      ).toEqual({
        url: "https://www.amazon.de/dp/B09XN22JBT?tag=mytag-21",
        changed: true,
      });
    });
  });

  describe("cart add endpoint", () => {
    const aggressive: SanitizeOptions = { aggressiveMode: true, allowedTags: [], replacementTag: "" };

    it("neutralizes the tag and keeps the other parameters in normal mode", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001&tag=foreign-20&Quantity=1", defaults)).toEqual({
        url: "https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001&tag=0&Quantity=1",
        changed: true,
      });
    });

    it("keeps the other parameters in aggressive mode", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001&tag=foreign-20&Quantity=1", aggressive)).toEqual({
        url: "https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001&tag=0&Quantity=1",
        changed: true,
      });
    });

    it("removes ascsubtag from a cart add URL", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001&ascsubtag=asc1", defaults)).toEqual({
        url: "https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001",
        changed: true,
      });
    });

    it("leaves a tag-less cart add URL unchanged in aggressive mode", () => {
      const input = "https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001&Quantity=1";
      expect(sanitizeAmazonUrl(input, aggressive)).toEqual({ url: input, changed: false });
    });

    it("does not apply the replacement tag to a cart add URL", () => {
      expect(
        sanitizeAmazonUrl("https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001&tag=foreign-20", {
          ...defaults,
          replacementTag: "mytag-21",
        }),
      ).toEqual({
        url: "https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001&tag=0",
        changed: true,
      });
    });

    it("keeps a cart add URL carrying an allowed tag completely untouched", () => {
      const input = "https://www.amazon.de/gp/aws/cart/add.html?ASIN=B001&tag=keepme";
      expect(sanitizeAmazonUrl(input, { ...aggressive, allowedTags: ["keepme"] })).toEqual({ url: input, changed: false });
    });
  });

  describe("non-Amazon URLs", () => {
    it.each([
      "https://www.google.com/search?q=amazon",
      "https://www.amazon.dealersite.com/dp/B001?tag=a-20",
      "https://amazon.comx/dp/B001?tag=a-20",
      "https://m.media-amazon.com/images/I/abc.jpg",
      "https://sub.media-amazon.com/dp/B001?tag=a-20",
      "not a url",
      "javascript:alert(1)",
      "file:///tmp/amazon.com/dp/B001",
    ])("returns null for %s", (input) => {
      expect(sanitizeAmazonUrl(input, defaults)).toBeNull();
    });
  });

  describe("host matching", () => {
    it("accepts subdomains", () => {
      expect(sanitizeAmazonUrl("https://sub.domain.amazon.de/dp/B001?tag=a-20", defaults)).toEqual({
        url: "https://sub.domain.amazon.de/dp/B001",
        changed: true,
      });
    });

    it("accepts multi-part TLDs from the host permission list", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.co.jp/dp/B001?tag=a-20", defaults)).toEqual({
        url: "https://www.amazon.co.jp/dp/B001",
        changed: true,
      });
    });

    it("rejects Amazon TLDs that are not in the host permission list", () => {
      expect(sanitizeAmazonUrl("https://www.amazon.xx/dp/B001?tag=a-20", defaults)).toBeNull();
    });
  });
});
