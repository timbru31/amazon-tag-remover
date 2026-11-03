import { isSafari, storage } from "./api.js";

interface StorageOptions {
  disableNotifications: boolean;
  allowedTags?: string[];
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

function saveOptions(e: Event): void {
  e.preventDefault();

  const allowedText = document.querySelector<HTMLTextAreaElement>("#allowed-tags")?.value ?? "";
  const allowedTags = allowedText
    .split("\n")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  void storage.set(
    {
      disableNotifications: document.querySelector<HTMLInputElement>("#disable-notifications")?.checked,
      allowedTags,
    },
    () => {
      // oxlint-disable-next-line typescript/no-non-null-assertion
      const submitButton = document.querySelector(".submit-button")!;
      // oxlint-disable-next-line typescript/no-non-null-assertion
      const checkmark = document.querySelector(".checkmark")!;

      submitButton.classList.add("hidden");
      checkmark.classList.add("visible");

      window.setTimeout(() => {
        window.close();
      }, 1500);
    },
  );
}

function setCurrentChoice(result: StorageOptions): void {
  const notificationCheckbox = document.querySelector<HTMLInputElement>("#disable-notifications");
  const allowedTextarea = document.querySelector<HTMLTextAreaElement>("#allowed-tags");

  if (notificationCheckbox) {
    notificationCheckbox.checked = result.disableNotifications;
  }

  if (allowedTextarea && result.allowedTags) {
    allowedTextarea.value = result.allowedTags.join("\n");
  }
}

function restoreOptions(): void {
  void storage.get(["disableNotifications", "allowedTags"]).then((options) => {
    setCurrentChoice(options as StorageOptions);
  });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form")?.addEventListener("submit", saveOptions);

handleSafariQuirks();
