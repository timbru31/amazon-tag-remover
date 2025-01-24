function show(platform, enabled, useSettingsInsteadOfPreferences) {
  document.body.classList.add(`platform-${platform}`);

  if (typeof enabled === 'boolean') {
    document.body.classList.toggle(`state-on`, enabled);
    document.body.classList.toggle(`state-off`, !enabled);
  } else {
    document.body.classList.remove(`state-on`);
    document.body.classList.remove(`state-off`);
  }
}

function openPreferences() {
  webkit.messageHandlers.controller.postMessage('open-preferences');
}

document.querySelector('button.platform-mac.open-preferences').addEventListener('click', openPreferences);
document.querySelector('button.platform-ios.open-preferences').addEventListener('click', openPreferences);
