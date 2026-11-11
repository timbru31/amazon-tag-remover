import { isSafari, storage } from "./api.js";
import { amazonDomains } from "./sanitize.js";

interface StorageOptions {
  disableNotifications: boolean;
  allowedTags?: string[];
  aggressiveMode?: boolean;
  replacementTag?: string;
  redirectRegion?: string;
}

function handleSafariQuirks(): void {
  if (isSafari()) {
    const notificationsSection = document.querySelector<HTMLElement>("#notifications-section");
    if (notificationsSection) {
      notificationsSection.style.display = "none";
    }

    const extensionSettingsLink = document.createElement("p");
    extensionSettingsLink.textContent =
      "Note: Make sure to allow access to Amazon domains in the Safari Extensions Preferences to enable all features.";
    extensionSettingsLink.classList.add("settings-hint");
    notificationsSection?.after(extensionSettingsLink);
  }
}

function populateRegionOptions(): void {
  const select = document.querySelector<HTMLSelectElement>("#redirect-region");
  if (!select) {
    return;
  }
  // The first option ("Off") is hardcoded in options.html; the regional sites
  // are appended in the order of amazonDomains (shared with the background).
  for (const domain of amazonDomains) {
    const option = document.createElement("option");
    option.value = domain;
    option.textContent = `amazon.${domain}`;
    select.append(option);
  }
}

async function saveOptions(e: Event): Promise<void> {
  e.preventDefault();

  const allowedText = document.querySelector<HTMLTextAreaElement>("#allowed-tags")?.value ?? "";
  const allowedTags = allowedText
    .split("\n")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  try {
    await storage.set({
      disableNotifications: document.querySelector<HTMLInputElement>("#disable-notifications")?.checked,
      allowedTags,
      aggressiveMode: document.querySelector<HTMLInputElement>("#aggressive-mode")?.checked,
      replacementTag: document.querySelector<HTMLInputElement>("#replacement-tag")?.value.trim() ?? "",
      redirectRegion: document.querySelector<HTMLSelectElement>("#redirect-region")?.value ?? "",
    });
  } catch (error) {
    console.error("Error saving options:", error);
    return;
  }

  document.querySelector(".submit-button")?.classList.add("hidden");
  document.querySelector(".checkmark")?.classList.add("visible");

  window.setTimeout(() => {
    window.close();
  }, 1500);
}

function setCurrentChoice(result: StorageOptions): void {
  const notificationCheckbox = document.querySelector<HTMLInputElement>("#disable-notifications");
  const allowedTextarea = document.querySelector<HTMLTextAreaElement>("#allowed-tags");
  const aggressiveCheckbox = document.querySelector<HTMLInputElement>("#aggressive-mode");
  const replacementInput = document.querySelector<HTMLInputElement>("#replacement-tag");
  const regionSelect = document.querySelector<HTMLSelectElement>("#redirect-region");

  if (notificationCheckbox) {
    notificationCheckbox.checked = result.disableNotifications;
  }

  if (allowedTextarea && result.allowedTags) {
    allowedTextarea.value = result.allowedTags.join("\n");
  }

  if (aggressiveCheckbox) {
    aggressiveCheckbox.checked = result.aggressiveMode === true;
  }

  if (replacementInput) {
    replacementInput.value = result.replacementTag ?? "";
  }

  if (regionSelect) {
    const region = result.redirectRegion;
    // Fall back to "Off" for a stored value that is no longer a known domain
    regionSelect.value = typeof region === "string" && amazonDomains.includes(region) ? region : "";
  }
}

function restoreOptions(): void {
  void storage.get(["disableNotifications", "allowedTags", "aggressiveMode", "replacementTag", "redirectRegion"]).then((options) => {
    setCurrentChoice(options as unknown as StorageOptions);
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form")?.addEventListener("submit", (e) => {
  void saveOptions(e);
});

populateRegionOptions();
handleSafariQuirks();
