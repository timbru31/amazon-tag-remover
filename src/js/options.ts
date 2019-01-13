// tslint:disable-next-line:variable-name
const __browser = chrome || browser;
// tslint:disable-next-line:variable-name
const _storage = __browser.storage.sync || __browser.storage.local;

function saveOptions(e: Event) {
	e.preventDefault();
	_storage.set({
		disableNotifications: document.querySelector<HTMLInputElement>('#disable-notifications')!.checked
	});
}

function restoreOptions() {
	function setCurrentChoice(result: any) {
		document.querySelector<HTMLInputElement>('#disable-notifications')!.checked = result.disableNotifications;
	}

	_storage.get('disableNotifications', setCurrentChoice);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form')!.addEventListener('submit', saveOptions);
