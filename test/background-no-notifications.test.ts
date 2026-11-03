import { describe, expect, it } from "vitest";
import { installBrowserMock } from "./browser-mock.js";

const browserMock = installBrowserMock({
  notifications: false,
  initial: { "removedTags-3": ["aff2"] },
});
await import("../src/js/background.js");

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

describe("background without notifications support", () => {
  it("still cleans up removed tags but never creates a notification", async () => {
    browserMock.webNavigation.onCompleted.emit({ tabId: 3 });
    await flushPromises();
    expect(browserMock.notifications).toBeUndefined();
    expect(sync.data["removedTags-3"]).toBeUndefined();
  });

  it("initializes default options on install and updates the rules", async () => {
    browserMock.runtime.onInstalled.emit({ reason: "install" });
    await flushPromises();
    expect(sync.data.disableNotifications).toBe(false);
    expect(sync.data.allowedTags).toEqual([]);
    expect(browserMock.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [],
      addRules: [],
    });
  });
});
