const isFirefox = typeof browser !== 'undefined';
type BrowserType = typeof browser | typeof chrome;

export const _browser: BrowserType = isFirefox ? browser : chrome;

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
export const storage = _browser.storage.sync || _browser.storage.local;

export function isSafari() {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const isDesktopSafari = 'safari' in window && navigator.vendor.includes('Apple');
  const isIOS =
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    navigator.vendor.includes('Apple') &&
    navigator.userAgent.includes('Safari') &&
    !/Chrome|Chromium/.test(navigator.userAgent) &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  return isDesktopSafari || isIOS;
}
