// In Firefox the WebExtensions API is exposed as the `browser` global, in Chromium
// browsers as `chrome` — only one of them exists at runtime, so pick it up front.
// Both are promise-based natively (Firefox ≥ 113, Chrome ≥ 116), no polyfill needed.
export const _browser = typeof browser === "undefined" ? chrome : browser;

export const storage = _browser.storage.sync || _browser.storage.local;

export function isSafari(): boolean {
  return navigator.vendor.includes("Apple") && navigator.userAgent.includes("Safari") && !/Chrome|Chromium/u.test(navigator.userAgent);
}
