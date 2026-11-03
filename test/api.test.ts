import { describe, expect, it, vi } from "vitest";
import { installBrowserMock } from "./browser-mock.js";

const browserMock = installBrowserMock();
const { storage, isSafari } = await import("../src/js/api.js");

vi.resetModules();
const localOnlyBrowserMock = installBrowserMock({ syncStorage: false });
const localOnlyApi = await import("../src/js/api.js");

function stubNavigator(vendor: string, userAgent: string): void {
  vi.stubGlobal("navigator", { vendor, userAgent });
}

const safariUserAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

describe("api", () => {
  describe("storage", () => {
    it("uses browser.storage.sync when available", () => {
      expect(storage).toBe(browserMock.storage.sync);
    });

    it("falls back to browser.storage.local when sync is unavailable", () => {
      expect(localOnlyApi.storage).toBe(localOnlyBrowserMock.storage.local);
    });
  });

  describe("isSafari", () => {
    it("returns true for Safari", () => {
      stubNavigator("Apple Computer, Inc.", safariUserAgent);
      expect(isSafari()).toBe(true);
    });

    it("returns false for Chrome (even with Apple vendor)", () => {
      stubNavigator(
        "Google Inc.",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      );
      expect(isSafari()).toBe(false);
    });

    it("returns false for Chromium-based browsers", () => {
      stubNavigator(
        "Apple Computer, Inc.",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/148.0.0.0 Safari/537.36 Chromium/148.0",
      );
      expect(isSafari()).toBe(false);
    });

    it("returns false for Firefox", () => {
      stubNavigator("Netscape", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0");
      expect(isSafari()).toBe(false);
    });
  });
});
