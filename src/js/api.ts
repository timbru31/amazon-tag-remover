// All supported browsers expose the WebExtensions API under the `browser`
// namespace: Firefox natively, and Chromium (Chrome 148+, Edge 136+, Opera
// 121+) alongside the legacy `chrome` namespace.
export const storage = browser.storage.sync || browser.storage.local;

export function isSafari(): boolean {
  return navigator.vendor.includes("Apple") && navigator.userAgent.includes("Safari") && !/Chrome|Chromium/u.test(navigator.userAgent);
}
