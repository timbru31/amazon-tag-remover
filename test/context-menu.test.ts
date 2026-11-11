import { beforeEach, describe, expect, it, vi } from "vitest";
import { installBrowserMock, type BrowserMock } from "./browser-mock.js";

const MENU_ITEM_ID = "copy-link-without-tracking-tag";

const defaults = { aggressiveMode: false, allowedTags: [], replacementTag: "", disableNotifications: false };

let browserMock: BrowserMock;
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  browserMock = installBrowserMock({ initial: { ...defaults } });
});

function stubClipboard(): void {
  writeText = vi.fn(async () => undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
}

// The module attaches its click listener at import time, so a fresh mock has
// to be in place before the (re-)import.
async function loadContextMenu(): Promise<typeof import("../src/js/context-menu.js")> {
  return import("../src/js/context-menu.js");
}

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

function clickLink(linkUrl: string): void {
  browserMock.contextMenus.onClicked.emit({ menuItemId: MENU_ITEM_ID, linkUrl });
}

describe("registerContextMenu", () => {
  it("registers the menu item when the clipboard API is available", async () => {
    stubClipboard();
    const { registerContextMenu } = await loadContextMenu();
    registerContextMenu();
    await flushPromises();
    expect(browserMock.contextMenus.removeAll).toHaveBeenCalled();
    expect(browserMock.contextMenus.create).toHaveBeenCalledWith({
      id: MENU_ITEM_ID,
      title: "Copy link without tracking tag",
      contexts: ["link"],
    });
  });

  it("skips registration when the clipboard API is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    const { registerContextMenu } = await loadContextMenu();
    registerContextMenu();
    await flushPromises();
    expect(browserMock.contextMenus.removeAll).not.toHaveBeenCalled();
    expect(browserMock.contextMenus.create).not.toHaveBeenCalled();
  });
});

describe("click handler", () => {
  it("copies the sanitized URL and notifies when a tag was removed", async () => {
    stubClipboard();
    await loadContextMenu();
    clickLink("https://www.amazon.de/dp/B001?tag=googcana-20");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("https://www.amazon.de/dp/B001");
    expect(browserMock.notifications?.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: "Copied the link without its tracking tag", title: "Tag Remover for Amazon" }),
    );
  });

  it("copies a clean Amazon link unchanged without notifying", async () => {
    stubClipboard();
    await loadContextMenu();
    clickLink("https://www.amazon.de/dp/B001?ref=ox");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("https://www.amazon.de/dp/B001?ref=ox");
    expect(browserMock.notifications?.create).not.toHaveBeenCalled();
  });

  it("does nothing for a non-Amazon link", async () => {
    stubClipboard();
    await loadContextMenu();
    clickLink("https://www.google.com/search?q=amazon");
    await flushPromises();
    expect(writeText).not.toHaveBeenCalled();
    expect(browserMock.notifications?.create).not.toHaveBeenCalled();
  });

  it("ignores clicks on other menu items", async () => {
    stubClipboard();
    await loadContextMenu();
    browserMock.contextMenus.onClicked.emit({ menuItemId: "other-item", linkUrl: "https://www.amazon.de/dp/B001?tag=a-20" });
    await flushPromises();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("replaces a foreign tag with the replacement tag", async () => {
    browserMock.storage.sync!.set({ replacementTag: "mytag-21" });
    stubClipboard();
    await loadContextMenu();
    clickLink("https://www.amazon.de/dp/B001?tag=foreign-20");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("https://www.amazon.de/dp/B001?tag=mytag-21");
  });

  it("keeps an allowed tag", async () => {
    browserMock.storage.sync!.set({ allowedTags: ["keepme"] });
    stubClipboard();
    await loadContextMenu();
    clickLink("https://www.amazon.de/dp/B001?tag=keepme&tag=foreign-20");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("https://www.amazon.de/dp/B001?tag=keepme&tag=foreign-20");
    expect(browserMock.notifications?.create).not.toHaveBeenCalled();
  });

  it("strips every query parameter in aggressive mode", async () => {
    browserMock.storage.sync!.set({ aggressiveMode: true });
    stubClipboard();
    await loadContextMenu();
    clickLink("https://www.amazon.de/dp/B001?tag=a-20&ref=ox&crId=x");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("https://www.amazon.de/dp/B001");
  });

  it("does not notify when notifications are disabled", async () => {
    browserMock.storage.sync!.set({ disableNotifications: true });
    stubClipboard();
    await loadContextMenu();
    clickLink("https://www.amazon.de/dp/B001?tag=a-20");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("https://www.amazon.de/dp/B001");
    expect(browserMock.notifications?.create).not.toHaveBeenCalled();
  });
});
