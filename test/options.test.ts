import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installBrowserMock, type BrowserMock, type StorageMock } from "./browser-mock.js";

function setupDom(): BrowserMock {
  document.body.innerHTML = `
    <form>
      <textarea id="allowed-tags"></textarea>
      <input id="disable-notifications" type="checkbox" />
      <button class="submit-button" type="submit">Save</button>
      <span class="checkmark">Saved</span>
    </form>
  `;
  return installBrowserMock();
}

/** Resolves after the microtask queue is drained (storage promises only need microtasks). */
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

describe("options page", () => {
  let browserMock: BrowserMock;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "close").mockImplementation(() => undefined);
    browserMock = setupDom();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetModules();
    document.body.innerHTML = "";
  });

  describe("restoreOptions", () => {
    it("applies the stored options on DOMContentLoaded", async () => {
      Object.assign(browserMock.storage.sync?.data ?? {}, { disableNotifications: true, allowedTags: ["tag-a", "tag-b"] });
      await import("../src/js/options.js");
      document.dispatchEvent(new Event("DOMContentLoaded"));
      await flushPromises();
      expect(document.querySelector<HTMLInputElement>("#disable-notifications")?.checked).toBe(true);
      expect(document.querySelector<HTMLTextAreaElement>("#allowed-tags")?.value).toBe("tag-a\ntag-b");
    });

    it("does not touch missing elements", async () => {
      document.querySelector<HTMLTextAreaElement>("#allowed-tags")?.remove();
      await import("../src/js/options.js");
      document.dispatchEvent(new Event("DOMContentLoaded"));
      await flushPromises();
      expect(browserMock.storage.sync?.data.disableNotifications).toBeUndefined();
    });
  });

  describe("saveOptions", () => {
    it("saves the trimmed, non-empty tags and closes the window", async () => {
      await import("../src/js/options.js");
      document.querySelector<HTMLTextAreaElement>("#allowed-tags")!.value = "  tag-a \n\n  tag-b \n";
      const submitButton = document.querySelector(".submit-button")!;
      const checkmark = document.querySelector(".checkmark")!;

      const submitEvent = new Event("submit", { cancelable: true });
      document.querySelector("form")!.dispatchEvent(submitEvent);
      await flushPromises();

      expect(submitEvent.defaultPrevented).toBe(true);
      expect(browserMock.storage.sync?.data.allowedTags).toEqual(["tag-a", "tag-b"]);
      expect(browserMock.storage.sync?.data.disableNotifications).toBe(false);
      expect(submitButton.classList.contains("hidden")).toBe(true);
      expect(checkmark.classList.contains("visible")).toBe(true);

      vi.advanceTimersByTime(1500);
      expect(window.close).toHaveBeenCalledTimes(1);
    });

    it("stores the notification toggle together with the tags", async () => {
      await import("../src/js/options.js");
      document.querySelector<HTMLInputElement>("#disable-notifications")!.checked = true;
      document.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
      await flushPromises();
      expect(browserMock.storage.sync?.data.disableNotifications).toBe(true);
      expect(browserMock.storage.sync?.data.allowedTags).toEqual([]);
    });

    it("does not show the checkmark or close when saving fails", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const sync = browserMock.storage.sync!;
      sync.set = vi.fn(async () => {
        throw new Error("storage unavailable");
      }) as StorageMock["set"];
      await import("../src/js/options.js");
      const submitButton = document.querySelector(".submit-button")!;
      const checkmark = document.querySelector(".checkmark")!;

      document.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
      await flushPromises();

      expect(consoleError).toHaveBeenCalledWith("Error saving options:", expect.any(Error));
      expect(submitButton.classList.contains("hidden")).toBe(false);
      expect(checkmark.classList.contains("visible")).toBe(false);
      expect(window.close).not.toHaveBeenCalled();
    });
  });
});
