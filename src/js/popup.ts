import { storage } from "./api.js";
import { normalizeReplacementTag, sanitizeAmazonUrl } from "./sanitize.js";

const button = document.querySelector<HTMLButtonElement>("#copy");
const statusElement = document.querySelector<HTMLElement>("#status");

function setStatus(text: string): void {
  if (statusElement) {
    statusElement.textContent = text;
  }
}

async function copyCurrentUrl(): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const { aggressiveMode, allowedTags, replacementTag } = await storage.get(["aggressiveMode", "allowedTags", "replacementTag"]);
  const result = tab?.url
    ? sanitizeAmazonUrl(tab.url, {
        aggressiveMode: aggressiveMode === true,
        allowedTags: (allowedTags as string[] | undefined) ?? [],
        replacementTag: normalizeReplacementTag(replacementTag),
      })
    : null;
  if (result === null) {
    setStatus("This is not an Amazon page.");
    return;
  }
  await navigator.clipboard.writeText(result.url);
  setStatus(result.changed ? "Copied without tracking tag." : "Copied (no tag found).");
}

button?.addEventListener("click", () => {
  copyCurrentUrl().catch((error: unknown) => {
    console.error("Error copying current URL:", error);
    setStatus("Could not copy the URL.");
  });
});
