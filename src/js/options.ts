import { storage } from './api.js';

function saveOptions(e: Event) {
  e.preventDefault();
  void storage.set({
    disableNotifications: document.querySelector<HTMLInputElement>('#disable-notifications')?.checked,
  });
}

function restoreOptions() {
  function setCurrentChoice(result: { disableNotifications: boolean }) {
    const abc = document.querySelector<HTMLInputElement>('#disable-notifications');
    if (abc) {
      abc.checked = result.disableNotifications;
    }
  }

  void storage.get<{ disableNotifications: boolean }>('disableNotifications').then((options) => {
    setCurrentChoice(options as { disableNotifications: boolean });
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form')?.addEventListener('submit', saveOptions);
