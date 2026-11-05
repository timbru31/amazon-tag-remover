import { isSafari, storage } from "./api.js";

interface StorageOptions {
  disableNotifications: boolean;
  allowedTags?: string[];
  aggressiveMode?: boolean;
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

  if (notificationCheckbox) {
    notificationCheckbox.checked = result.disableNotifications;
  }

  if (allowedTextarea && result.allowedTags) {
    allowedTextarea.value = result.allowedTags.join("\n");
  }

  if (aggressiveCheckbox) {
    aggressiveCheckbox.checked = result.aggressiveMode === true;
  }
}

function restoreOptions(): void {
  void storage.get(["disableNotifications", "allowedTags", "aggressiveMode"]).then((options) => {
    setCurrentChoice(options as unknown as StorageOptions);
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form")?.addEventListener("submit", (e) => {
  void saveOptions(e);
});

handleSafariQuirks();
