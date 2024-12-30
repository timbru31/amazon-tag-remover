import { storage } from './api.js';

interface StorageOptions {
  disableNotifications: boolean;
  allowedTags?: string[];
}

function saveOptions(e: Event) {
  e.preventDefault();

  const allowedText = document.querySelector<HTMLTextAreaElement>('#allowed-tags')?.value ?? '';
  const allowedTags = allowedText
    .split('\n')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  void storage.set({
    disableNotifications: document.querySelector<HTMLInputElement>('#disable-notifications')?.checked,
    allowedTags,
  });
}

function restoreOptions() {
  function setCurrentChoice(result: StorageOptions) {
    const notificationCheckbox = document.querySelector<HTMLInputElement>('#disable-notifications');
    const allowedTextarea = document.querySelector<HTMLTextAreaElement>('#allowed-tags');

    if (notificationCheckbox) {
      notificationCheckbox.checked = result.disableNotifications;
    }

    if (allowedTextarea && result.allowedTags) {
      allowedTextarea.value = result.allowedTags.join('\n');
    }
  }

  void storage.get(['disableNotifications', 'allowedTags']).then((options) => {
    setCurrentChoice(options as StorageOptions);
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form')?.addEventListener('submit', saveOptions);
