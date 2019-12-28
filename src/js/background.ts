import { storage } from './api';

let tags: string[] = [];
const amazonTagRemoverNotification = 'amazon-tag-remover-notification';
const amazonURLs = [
	'*://*.amazon.ae/*',
	'*://*.amazon.at/*',
	'*://*.amazon.ca/*',
	'*://*.amazon.cn/*',
	'*://*.amazon.co.jp/*',
	'*://*.amazon.co.uk/*',
	'*://*.amazon.com.au/*',
	'*://*.amazon.com.br/*',
	'*://*.amazon.com.mx/*',
	'*://*.amazon.com.sg/*',
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

const urlPattern = 'https?://w*.?amazon.(ae|ca|cn|co.jp|co.uk|com.au|com.br|com.mx|com.sg|com.tr|com|de|es|fr|ie|in|it|nl)/w*';
const urlRegExp = new RegExp(urlPattern);

interface BeforeRequestResponse {
	url: string;
}

browser.webRequest.onBeforeRequest.addListener(
	interceptRequest,
	{
		urls: amazonURLs
	},
	['blocking']
);
browser.webNavigation.onCompleted.addListener(
	event => {
		if (urlRegExp.test(event.url)) {
			if (tags && tags.length) {
				storage.get('disableNotifications').then((item: any) => {
					if (!item.disableNotifications) {
						// EdgeHTML sometimes does not return a Promise, but undefined
						const potentialNotificationPromise = browser.notifications.create(amazonTagRemoverNotification, {
							iconUrl: browser.extension.getURL('images/icon64.png'),
							message: `The following tags were found and have been removed: ${tags}`,
							title: 'Amazon Tag Remover',
							type: 'basic'
						});
						if (potentialNotificationPromise && potentialNotificationPromise.then) {
							potentialNotificationPromise.then(() => (tags = []));
						}
					} else {
						tags = [];
					}
				});
			}
		}
	},
	{
		url: [
			{
				urlMatches: urlPattern
			}
		]
	}
);

function interceptRequest(request: BeforeRequestResponse) {
	if (request && request.url) {
		const sanitizedResult = sanitizeURL(request.url);
		if (sanitizedResult.match) {
			return { redirectUrl: sanitizedResult.url };
		}
	}
}

function sanitizeURL(urlString: string) {
	let rawURL = decodeURIComponent(urlString);
	// URL does not contain a valid query parameter, patch it
	if (!rawURL.includes('?') && rawURL.includes('&')) {
		rawURL = replaceAt(rawURL, rawURL.lastIndexOf('/'), '?');
	}
	const url = new URL(rawURL);
	let match = false;
	const searchParams = url.searchParams;
	const tag = searchParams.get('tag');
	if (tag && !url.pathname.includes('watchlistToggle')) {
		tags.push(tag);
		match = true;
		searchParams.delete('tag');
	}
	if (searchParams.has('ascsubtag')) {
		tags.push(searchParams.get('ascsubtag')!);
		match = true;
		searchParams.delete('ascsubtag');
	}
	return { match, url: url.toString() };
}

function replaceAt(original: string, index: number, replacement: string) {
	return original.substr(0, index) + replacement + original.substr(index + replacement.length);
}
