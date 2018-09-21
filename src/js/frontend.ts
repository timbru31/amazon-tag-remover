// tslint:disable-next-line:variable-name
const __browser = chrome || browser;
__browser.runtime.onMessage.addListener((request, _, resetTag) => {
	const div = document.createElement('div');
	div.className = 'amazon-tag-remover';
	div.textContent = `The following tags were found and have been removed: ${request.tags}`;
	document.body.appendChild(div);
	div.classList.toggle('amazon-tag-remover-fade-in');

	setTimeout(() => {
		div.classList.toggle('amazon-tag-remover-fade-in');
		div.classList.toggle('amazon-tag-remover-fade-out');
	}, 7000);
	resetTag(null);
});
