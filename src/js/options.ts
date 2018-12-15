// tslint:disable-next-line:variable-name
const __browser = chrome || browser;

function saveOptions(e: Event) {
	e.preventDefault();
	__browser.storage.local.set({
		enableNotifications: document.querySelector<HTMLInputElement>('#enable-notifications')!.checked
	});
}

function restoreOptions() {
	function setCurrentChoice(result: any) {
		document.querySelector<HTMLInputElement>('#enable-notifications')!.checked = result.enableNotifications;
	}

	__browser.storage.local.get('enableNotifications', setCurrentChoice);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form')!.addEventListener('submit', saveOptions);
