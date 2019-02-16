// tslint:disable-next-line:variable-name
const _browser = chrome || browser;
let tags: string[] = [];
const amazonTagRemoverNotification = 'amazon-tag-remover-notification';
const amazonURLs = [
	'*://*.amazon.at/*',
	'*://*.amazon.ca/*',
	'*://*.amazon.cn/*',
	'*://*.amazon.co.jp/*',
	'*://*.amazon.co.uk/*',
	'*://*.amazon.com.au/*',
	'*://*.amazon.com.br/*',
	'*://*.amazon.com.mx/*',
	'*://*.amazon.com.tr/*',
	'*://*.amazon.com/*',
	'*://*.amazon.de/*',
	'*://*.amazon.es/*',
	'*://*.amazon.fr/*',
	'*://*.amazon.ie/*',
	'*://*.amazon.in/*',
	'*://*.amazon.it/*',
	'*://*.amazon.nl/*'
];
const storage = _browser.storage.sync || _browser.storage.local;

_browser.webRequest.onBeforeRequest.addListener(
	interceptRequest,
	{
		urls: amazonURLs
	},
	['blocking']
);
_browser.webNavigation.onCompleted.addListener(
	() => {
		if (tags && tags.length) {
			storage.get('disableNotifications', (item: any) => {
				if (!item.disableNotifications) {
					_browser.notifications.create(
						amazonTagRemoverNotification,
						{
							iconUrl: _browser.extension.getURL('images/icon64.png'),
							message: `The following tags were found and have been removed: ${tags}`,
							title: 'Amazon Tag Remover',
							type: 'basic'
						},
						() => (tags = [])
					);
				} else {
					tags = [];
				}
			});
		}
	},
	{
		url: [
			{
				urlMatches: 'https?://w*.?amazon.(at|ca|cn|co.jp|co.uk|com.au|com.br|com.mx|com.tr|com|de|es|fr|ie|in|it|nl)/w*'
			}
		]
	}
);

function interceptRequest(request: chrome.webRequest.WebRequestBodyDetails) {
	if (request && request.url) {
		const sanitizedResult = sanitizeURL(request.url);
		if (sanitizedResult.match) {
			return { redirectUrl: sanitizedResult.url };
		}
	}
}

function sanitizeURL(urlString: string) {
	const url = new URL(decodeURIComponent(urlString));
	let match = false;
	const searchParams = url.searchParams;
	if (searchParams.has('tag')) {
		tags.push(searchParams.get('tag')!);
		match = true;
	}
	if (searchParams.has('ascsubtag')) {
		tags.push(searchParams.get('ascsubtag')!);
		match = true;
	}
	searchParams.delete('tag');
	searchParams.delete('ascsubtag');
	return { match, url: url.toString() };
}
