import { beforeEach, describe, expect, it, vi } from "vitest";
import { installBrowserMock } from "./browser-mock.js";

const browserMock = installBrowserMock();
const background = await import("../src/js/background.js");

const sync = browserMock.storage.sync!;

function flushPromises(times = 10): Promise<void> {
  return new Promise((resolve) => {
    let remaining = times;
    const tick = () => {
      remaining -= 1;
      if (remaining > 0) void Promise.resolve().then(tick);
      else resolve();
    };
    tick();
  });
}

function regexOf(regexFilter: string | undefined): RegExp {
  return new RegExp(regexFilter ?? "");
}

describe("createAmazonRules", () => {
  it("returns no rules when no tags are allowed", () => {
    expect(background.createAmazonRules([])).toEqual([]);
  });

  it("creates a tag and ascsubtag rule per allowed tag", () => {
    const rules = background.createAmazonRules(["aff1"]);
    expect(rules).toHaveLength(2);
    expect(rules[0]?.id).toBe(1);
    expect(rules[1]?.id).toBe(2);
    expect(rules[0]?.action).toEqual({ type: "allow" });
    expect(rules[1]?.action).toEqual({ type: "allow" });
    // Must outrank the redirect rules in rules.json (highest priority 10),
    // since DNR evaluates rule priority before the action type.
    expect(rules[0]?.priority).toBe(100);
    expect(rules[0]?.condition?.resourceTypes).toEqual(["main_frame", "sub_frame"]);
  });

  it("numbers rule ids by tag index", () => {
    const rules = background.createAmazonRules(["aff1", "aff2"]);
    expect(rules.map((rule) => rule.id)).toEqual([1, 2, 3, 4]);
  });

  it("matches Amazon URLs carrying the tag parameter", () => {
    const [tagRule, ascsubtagRule] = background.createAmazonRules(["aff1"]);
    expect(regexOf(tagRule?.condition.regexFilter).test("https://www.amazon.de/dp/B001?tag=aff1")).toBe(true);
    expect(regexOf(tagRule?.condition.regexFilter).test("https://www.amazon.com/s?k=books&tag=aff1&ref=xx")).toBe(true);
    expect(regexOf(ascsubtagRule?.condition.regexFilter).test("https://www.amazon.de/dp/B001?ascsubtag=aff1")).toBe(true);
  });

  it("does not match URLs without the tag or on non-Amazon domains", () => {
    const [tagRule, ascsubtagRule] = background.createAmazonRules(["aff1"]);
    expect(regexOf(tagRule?.condition.regexFilter).test("https://www.amazon.de/dp/B001")).toBe(false);
    expect(regexOf(tagRule?.condition.regexFilter).test("https://www.amazon.de/dp/B001?tag=other")).toBe(false);
    expect(regexOf(tagRule?.condition.regexFilter).test("https://www.example.com/dp?tag=aff1")).toBe(false);
    expect(regexOf(ascsubtagRule?.condition.regexFilter).test("https://www.amazon.de/dp/B001?tag=aff1")).toBe(false);
  });

  it("escapes regex special characters in tags", () => {
    const [tagRule] = background.createAmazonRules(["foo.*+bar"]);
    const regex = regexOf(tagRule?.condition.regexFilter);
    expect(regex.test("https://www.amazon.com/dp?tag=foo.*+bar")).toBe(true);
    // Without escaping, "foo.*+bar" would also match "fooxbar".
    expect(regex.test("https://www.amazon.com/dp?tag=fooxbar")).toBe(false);
  });
});

describe("aggressive mode rules", () => {
  const sluggedProductRule = background.createAggressiveSluggedProductRule();
  const bareProductRule = background.createAggressiveBareProductRule();
  const urlRule = background.createAggressiveUrlRule();

  it("has fixed ids and priorities between the static rules and the allow rules", () => {
    // The product rules must outrank the url rule (DNR: higher number wins) so a
    // slugged product URL is canonicalized in one redirect.
    expect(sluggedProductRule.id).toBe(100001);
    expect(urlRule.id).toBe(100002);
    expect(bareProductRule.id).toBe(100003);
    expect(sluggedProductRule.priority).toBe(6);
    expect(bareProductRule.priority).toBe(6);
    expect(urlRule.priority).toBe(5);
    for (const rule of [sluggedProductRule, bareProductRule, urlRule]) {
      // Must outrank the base tag removal rule (priority 1), but stay below the
      // cart add rule (priority 10) and the allow rules (priority 100).
      expect(rule.priority).toBeGreaterThan(1);
      expect(rule.priority).toBeLessThan(10);
      expect(rule.priority).toBeLessThan(100);
      expect(rule.action.type).toBe("redirect");
      expect(rule.condition.resourceTypes).toEqual(["main_frame", "sub_frame"]);
    }
  });

  it("createAggressiveRules returns all rules in priority order", () => {
    expect(background.createAggressiveRules()).toEqual([sluggedProductRule, bareProductRule, urlRule]);
  });

  /** DNR applies only the highest-priority matching rule. */
  function cleaned(url: string): string {
    for (const rule of [sluggedProductRule, bareProductRule, urlRule]) {
      const regex = regexOf(rule.condition.regexFilter);
      const match = url.match(regex);
      if (match) {
        // DNR substitution uses \1 for capture groups, JS replace uses $1
        const substitution = String(rule.action.redirect?.regexSubstitution).replace(/\\([1-9])/gu, (_m, d) => `$${d}`);
        return url.replace(regex, substitution);
      }
    }
    return url;
  }

  it("drops the title slug, /ref segment and every query parameter", () => {
    // The exact link from the issue
    expect(
      cleaned(
        "https://www.amazon.com/Mitutoyo-Advanced-Absolute-Digital-Caliper/dp/B00WMKUUAQ/ref=as_li_ss_tl?ie=UTF8&linkCode=sl1&linkId=0ca01780457ac001751b779809516530&language=en_US",
      ),
    ).toBe("https://www.amazon.com/dp/B00WMKUUAQ");
    expect(cleaned("https://www.amazon.de/Some-Long-Title/dp/B00WMKUUAQ?k=x")).toBe("https://www.amazon.de/dp/B00WMKUUAQ");
    expect(cleaned("https://www.amazon.com/Brand/Title-Text/dp/B00WMKUUAQ/ref=as_li_ss_tl")).toBe("https://www.amazon.com/dp/B00WMKUUAQ");
  });

  it("canonicalizes the /gp/product/ and /product/ shapes to /dp/<ASIN>", () => {
    // /gp/product/: the /gp segment counts as the slug
    expect(cleaned("https://www.amazon.de/gp/product/B0GXB9QXR5")).toBe("https://www.amazon.de/dp/B0GXB9QXR5");
    expect(cleaned("https://www.amazon.de/gp/product/B0GXB9QXR5/ref=sr_1_1?tag=foo")).toBe("https://www.amazon.de/dp/B0GXB9QXR5");
    // bare /product/: handled by the separate bare product rule
    expect(cleaned("https://www.amazon.com/product/B0GXB9QXR5?th=1")).toBe("https://www.amazon.com/dp/B0GXB9QXR5");
  });

  it("strips the query or ref segment from an already-canonical /dp/<ASIN>", () => {
    expect(cleaned("https://www.amazon.de/dp/B00WMKUUAQ?tag=aff1")).toBe("https://www.amazon.de/dp/B00WMKUUAQ");
    expect(cleaned("https://www.amazon.de/dp/B00WMKUUAQ/ref=as_li_ss_tl")).toBe("https://www.amazon.de/dp/B00WMKUUAQ");
    expect(cleaned("https://www.amazon.de/dp/B00WMKUUAQ/ref=as_li_ss_tl?ie=UTF8")).toBe("https://www.amazon.de/dp/B00WMKUUAQ");
  });

  it("strips the query from non-product pages", () => {
    expect(cleaned("https://www.amazon.com/s?k=caliper&page=2")).toBe("https://www.amazon.com/s");
    expect(cleaned("https://www.amazon.de/s/ref=nb_sb_noss")).toBe("https://www.amazon.de/s");
  });

  it("leaves already-clean URLs untouched (no no-op redirect)", () => {
    expect(cleaned("https://www.amazon.com/dp/B00WMKUUAQ")).toBe("https://www.amazon.com/dp/B00WMKUUAQ");
  });

  it("does not match non-amazon or media-amazon hosts", () => {
    expect(cleaned("https://www.example.com/Slug/dp/B00WMKUUAQ/ref=xx")).toBe("https://www.example.com/Slug/dp/B00WMKUUAQ/ref=xx");
    expect(cleaned("https://m.media-amazon.com/images/xx/ref=x")).toBe("https://m.media-amazon.com/images/xx/ref=x");
  });

  it("canonicalizes even a short non-ASIN segment (product-shaped URLs only, see ASIN bound)", () => {
    // The slugged rule uses an unbounded ASIN class for RE2 budget headroom, so
    // a short segment after /dp/ is canonicalized too (it 404s either way).
    expect(cleaned("https://amazon.com/gp/aw/ref=xx/dp/B01")).toBe("https://amazon.com/dp/B01");
  });
});

describe("hasTrailingRefSegment", () => {
  it("detects a trailing /ref=... path segment", () => {
    expect(background.hasTrailingRefSegment("/Mitutoyo-Caliper/dp/B00WMKUUAQ/ref=as_li_ss_tl")).toBe(true);
    expect(background.hasTrailingRefSegment("/s/ref=nb_sb_noss")).toBe(true);
  });

  it("ignores other paths and query-only refs", () => {
    expect(background.hasTrailingRefSegment("/dp/B001")).toBe(false);
    expect(background.hasTrailingRefSegment("/gp/aw/ref=xx/dp/B01")).toBe(false);
  });
});

describe("updateRules", () => {
  beforeEach(() => {
    browserMock.declarativeNetRequest.getDynamicRules.mockReset().mockResolvedValue([]);
    browserMock.declarativeNetRequest.updateDynamicRules.mockReset().mockResolvedValue(undefined);
  });

  it("replaces all existing dynamic rules with the rules for the allowed tags", async () => {
    browserMock.declarativeNetRequest.getDynamicRules.mockResolvedValueOnce([{ id: 11 }, { id: 12 }]);
    await background.updateRules(["aff1"]);
    expect(browserMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [11, 12],
      addRules: background.createAmazonRules(["aff1"]),
    });
  });

  it("adds the aggressive rule only when aggressive mode is enabled", async () => {
    await background.updateRules([], true);
    expect(browserMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [],
      addRules: background.createAggressiveRules(),
    });

    browserMock.declarativeNetRequest.updateDynamicRules.mockClear();
    await background.updateRules(["aff1"], false);
    expect(browserMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [],
      addRules: background.createAmazonRules(["aff1"]),
    });
  });

  it("logs and swallows errors instead of throwing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    browserMock.declarativeNetRequest.getDynamicRules.mockRejectedValueOnce(new Error("boom"));
    await expect(background.updateRules(["aff1"])).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith("Error updating rules:", expect.any(Error));
    consoleError.mockRestore();
  });
});

describe("background event listeners", () => {
  beforeEach(() => {
    browserMock.declarativeNetRequest.getDynamicRules.mockReset().mockResolvedValue([]);
    browserMock.declarativeNetRequest.updateDynamicRules.mockReset().mockResolvedValue(undefined);
    browserMock.notifications?.create.mockReset().mockResolvedValue("amazonTagRemoverNotification");
    delete sync.data.allowedTags;
    delete sync.data.aggressiveMode;
  });

  describe("webNavigation.onBeforeNavigate", () => {
    it("stores the removed tags for the tab", async () => {
      browserMock.webNavigation.onBeforeNavigate.emit({ tabId: 7, url: "https://www.amazon.de/dp/B001?tag=aff1" });
      await flushPromises();
      expect(sync.data["removedTags-7"]).toEqual(["aff1"]);
    });

    it("dedupes tags repeated across tag and ascsubtag parameters", async () => {
      browserMock.webNavigation.onBeforeNavigate.emit({ tabId: 8, url: "https://www.amazon.de/dp/B001?tag=a&tag=b&ascsubtag=a" });
      await flushPromises();
      expect(sync.data["removedTags-8"]).toEqual(["a", "b"]);
    });

    it("clears a stale removedTags entry when the URL has no tags", async () => {
      sync.data["removedTags-9"] = ["stale"];
      browserMock.webNavigation.onBeforeNavigate.emit({ tabId: 9, url: "https://www.amazon.de/dp/B001" });
      await flushPromises();
      expect(sync.data["removedTags-9"]).toBeUndefined();
    });

    it("logs invalid URLs instead of throwing", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      browserMock.webNavigation.onBeforeNavigate.emit({ tabId: 10, url: "not a url" });
      await flushPromises();
      // Assert on name/message instead of expect.any(Error): under pool: "vmThreads"
      // the TypeError thrown by new URL() comes from a different V8 realm, so instanceof fails.
      expect(consoleError).toHaveBeenCalledWith(
        "Error storing removed tags:",
        expect.objectContaining({ name: "TypeError", message: "Invalid URL" }),
      );
      expect(sync.data["removedTags-10"]).toBeUndefined();
      consoleError.mockRestore();
    });

    describe("aggressive mode", () => {
      beforeEach(() => {
        sync.data.aggressiveMode = true;
      });

      it("stores every query parameter name and the ref segment for the tab", async () => {
        browserMock.webNavigation.onBeforeNavigate.emit({
          tabId: 20,
          url: "https://www.amazon.de/dp/B001/ref=as_li_ss_tl?tag=aff1&linkCode=sl1&ie=UTF8",
        });
        await flushPromises();
        expect(sync.data["aggressiveRemoved-20"]).toEqual(["tag", "linkCode", "ie", "ref"]);
        // The regular tag notification is subsumed by the aggressive one
        expect(sync.data["removedTags-20"]).toBeUndefined();
      });

      it("stores only query parameter names when there is no ref segment", async () => {
        browserMock.webNavigation.onBeforeNavigate.emit({ tabId: 21, url: "https://www.amazon.de/s?k=books" });
        await flushPromises();
        expect(sync.data["aggressiveRemoved-21"]).toEqual(["k"]);
      });

      it("clears stale entries when the URL has nothing to clean", async () => {
        sync.data["aggressiveRemoved-22"] = ["tag"];
        browserMock.webNavigation.onBeforeNavigate.emit({ tabId: 22, url: "https://www.amazon.de/dp/B001" });
        await flushPromises();
        expect(sync.data["aggressiveRemoved-22"]).toBeUndefined();
      });

      it("does not store anything when an allowed tag is present", async () => {
        sync.data.allowedTags = ["aff1"];
        browserMock.webNavigation.onBeforeNavigate.emit({ tabId: 23, url: "https://www.amazon.de/dp/B001?tag=aff1" });
        await flushPromises();
        expect(sync.data["aggressiveRemoved-23"]).toBeUndefined();
      });

      it("falls back to the regular tag notification on the cart add endpoint", async () => {
        browserMock.webNavigation.onBeforeNavigate.emit({
          tabId: 25,
          url: "https://www.amazon.de/gp/aws/cart/add.html?ASIN.1=B001&Quantity.1=1&tag=aff1",
        });
        await flushPromises();
        expect(sync.data["aggressiveRemoved-25"]).toBeUndefined();
        expect(sync.data["removedTags-25"]).toEqual(["aff1"]);
      });

      it("clears the aggressive entry when aggressive mode is turned off", async () => {
        sync.data.aggressiveMode = false;
        sync.data["aggressiveRemoved-24"] = ["tag"];
        browserMock.webNavigation.onBeforeNavigate.emit({ tabId: 24, url: "https://www.amazon.de/dp/B001?tag=aff1" });
        await flushPromises();
        expect(sync.data["aggressiveRemoved-24"]).toBeUndefined();
        expect(sync.data["removedTags-24"]).toEqual(["aff1"]);
      });
    });
  });

  describe("webNavigation.onCompleted", () => {
    it("shows a notification listing the removed tags and cleans up storage", async () => {
      sync.data.disableNotifications = false;
      sync.data["removedTags-5"] = ["aff1", "aff2"];
      browserMock.webNavigation.onCompleted.emit({ tabId: 5 });
      await flushPromises();
      expect(browserMock.notifications?.create).toHaveBeenCalledTimes(1);
      expect(browserMock.notifications?.create).toHaveBeenCalledWith(
        "amazonTagRemoverNotification",
        expect.objectContaining({
          title: "Tag Remover for Amazon",
          message: "The following tracking tags have been removed: aff1, aff2",
        }),
      );
      expect(sync.data["removedTags-5"]).toBeUndefined();
    });

    it("does not notify when notifications are disabled", async () => {
      sync.data.disableNotifications = true;
      sync.data["removedTags-6"] = ["aff1"];
      browserMock.webNavigation.onCompleted.emit({ tabId: 6 });
      await flushPromises();
      expect(browserMock.notifications?.create).not.toHaveBeenCalled();
      expect(sync.data["removedTags-6"]).toBeUndefined();
    });

    it("does not notify for allowed tags", async () => {
      sync.data.disableNotifications = false;
      sync.data.allowedTags = ["aff1"];
      sync.data["removedTags-11"] = ["aff1"];
      browserMock.webNavigation.onCompleted.emit({ tabId: 11 });
      await flushPromises();
      expect(browserMock.notifications?.create).not.toHaveBeenCalled();
      expect(sync.data["removedTags-11"]).toBeUndefined();
    });

    it("does nothing when no tags were removed in the tab", async () => {
      browserMock.webNavigation.onCompleted.emit({ tabId: 12 });
      await flushPromises();
      expect(browserMock.notifications?.create).not.toHaveBeenCalled();
    });

    it("shows the aggressive notification and cleans up both keys", async () => {
      sync.data.disableNotifications = false;
      sync.data["aggressiveRemoved-13"] = ["tag", "linkCode", "ref"];
      browserMock.webNavigation.onCompleted.emit({ tabId: 13 });
      await flushPromises();
      expect(browserMock.notifications?.create).toHaveBeenCalledTimes(1);
      expect(browserMock.notifications?.create).toHaveBeenCalledWith(
        "amazonTagRemoverNotification",
        expect.objectContaining({
          title: "Tag Remover for Amazon",
          message: "The following tracking information has been removed (aggressive mode): tag, linkCode, ref",
        }),
      );
      expect(sync.data["aggressiveRemoved-13"]).toBeUndefined();
    });

    it("does not show the aggressive notification when notifications are disabled", async () => {
      sync.data.disableNotifications = true;
      sync.data["aggressiveRemoved-14"] = ["tag"];
      browserMock.webNavigation.onCompleted.emit({ tabId: 14 });
      await flushPromises();
      expect(browserMock.notifications?.create).not.toHaveBeenCalled();
      expect(sync.data["aggressiveRemoved-14"]).toBeUndefined();
    });
  });

  describe("storage.onChanged", () => {
    it("updates the rules when allowedTags change", async () => {
      sync.data.allowedTags = ["aff1"];
      browserMock.storage.onChanged.emit({ allowedTags: { oldValue: [], newValue: ["aff1"] } });
      await flushPromises();
      expect(browserMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [],
        addRules: background.createAmazonRules(["aff1"]),
      });
    });

    it("updates the rules when aggressiveMode changes", async () => {
      sync.data.aggressiveMode = true;
      browserMock.storage.onChanged.emit({ aggressiveMode: { oldValue: false, newValue: true } });
      await flushPromises();
      expect(browserMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [],
        addRules: background.createAggressiveRules(),
      });
    });

    it("keeps the allowed tag rules when aggressiveMode changes", async () => {
      sync.data.allowedTags = ["aff1"];
      sync.data.aggressiveMode = true;
      browserMock.storage.onChanged.emit({ aggressiveMode: { oldValue: false, newValue: true } });
      await flushPromises();
      expect(browserMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [],
        addRules: [...background.createAmazonRules(["aff1"]), ...background.createAggressiveRules()],
      });
    });
  });
});
