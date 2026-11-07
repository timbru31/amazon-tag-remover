import { storage } from "./api.js";
import { normalizeReplacementTag, sanitizeAmazonUrl } from "./sanitize.js";

const COPY_MENU_ITEM_ID = "copy-link-without-tracking-tag";
const COPY_NOTIFICATION_ID = "amazonTagRemoverCopyNotification";

// Chromium only exposes navigator.clipboard in the service worker from 157 on
// (together with the clipboardWrite permission); where it is missing the menu
// item would write nowhere, so registration is skipped instead of showing a
// dead menu entry.
export function registerContextMenu(): void {
  if (typeof navigator.clipboard?.writeText !== "function") {
    return;
  }
  // The service worker restarts on demand, but context menu items survive the
  // restart, so remove them before recreating to avoid a duplicate-id error.
  void browser.contextMenus.removeAll().then(() =>
    browser.contextMenus.create({
      id: COPY_MENU_ITEM_ID,
      title: "Copy link without tracking tag",
      contexts: ["link"],
    }),
  );
}

browser.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== COPY_MENU_ITEM_ID || !info.linkUrl) {
    return;
  }
  try {
    const { aggressiveMode, allowedTags, replacementTag } = await storage.get(["aggressiveMode", "allowedTags", "replacementTag"]);
    const result = sanitizeAmazonUrl(info.linkUrl, {
      aggressiveMode: aggressiveMode === true,
      allowedTags: (allowedTags as string[] | undefined) ?? [],
      replacementTag: normalizeReplacementTag(replacementTag),
    });
    if (result === null) {
      // The item shows up for every link; anything that is not an Amazon URL
      // is simply left alone.
      return;
    }
    await navigator.clipboard.writeText(result.url);
    if (!result.changed) {
      return;
    }
    const { disableNotifications } = await storage.get("disableNotifications");
    if (!disableNotifications && browser.notifications) {
      await browser.notifications.create(COPY_NOTIFICATION_ID, {
        iconUrl: browser.runtime.getURL("images/icon64.png"),
        message: "Copied the link without its tracking tag",
        title: "Tag Remover for Amazon",
        type: "basic",
      });
    }
  } catch (error) {
    console.error("Error copying sanitized link:", error);
  }
});
