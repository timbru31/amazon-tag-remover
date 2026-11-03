export const storage = browser.storage.sync || browser.storage.local;

export function isSafari(): boolean {
  return navigator.vendor.includes("Apple") && navigator.userAgent.includes("Safari") && !/Chrome|Chromium/u.test(navigator.userAgent);
}
