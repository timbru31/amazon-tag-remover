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
      expect(consoleError).toHaveBeenCalledWith("Error storing removed tags:", expect.any(Error));
      expect(sync.data["removedTags-10"]).toBeUndefined();
      consoleError.mockRestore();
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
  });

  describe("storage.onChanged", () => {
    it("updates the rules when allowedTags change", async () => {
      browserMock.storage.onChanged.emit({ allowedTags: { oldValue: [], newValue: ["aff1"] } });
      await flushPromises();
      expect(browserMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
        removeRuleIds: [],
        addRules: background.createAmazonRules(["aff1"]),
      });
    });
  });
});
