import { storage } from './api';

function saveOptions(e: Event) {
	e.preventDefault();
	storage.set({
		disableNotifications: document.querySelector<HTMLInputElement>('#disable-notifications')!.checked
	});
}

function restoreOptions() {
	function setCurrentChoice(result: any) {
		document.querySelector<HTMLInputElement>('#disable-notifications')!.checked = result.disableNotifications;
	}

	storage.get('disableNotifications').then(setCurrentChoice);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form')!.addEventListener('submit', saveOptions);
