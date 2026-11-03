const isFirefox = typeof browser !== "undefined";
type BrowserType = typeof browser | typeof chrome;

export const _browser: BrowserType = isFirefox ? browser : chrome;

export const storage = _browser.storage.sync || _browser.storage.local;

export function isSafari(): boolean {
  return navigator.vendor.includes("Apple") && navigator.userAgent.includes("Safari") && !/Chrome|Chromium/u.test(navigator.userAgent);
}
