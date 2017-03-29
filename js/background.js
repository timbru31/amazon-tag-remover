'use strict';

let tags = [];
const _browser = this.browser || this.chrome;
const amazonURLs = [
  '*://*.amazon.at/*',
  '*://*.amazon.ca/*',
  '*://*.amazon.cn/*',
  '*://*.amazon.co.jp/*',
  '*://*.amazon.co.uk/*',
  '*://*.amazon.com.au/*',
  '*://*.amazon.com.br/*',
  '*://*.amazon.com.mx/*',
  '*://*.amazon.com/*',
  '*://*.amazon.de/*',
  '*://*.amazon.es/*',
  '*://*.amazon.fr/*',
  '*://*.amazon.ie/*',
  '*://*.amazon.in/*',
  '*://*.amazon.it/*',
  '*://*.amazon.nl/*'
];

_browser.webRequest.onBeforeRequest.addListener(interceptRequest, {
  'urls': amazonURLs
}, ['blocking']);

_browser.webNavigation.onCompleted.addListener(() => {
  if (tags && tags.length) {
    renderBox();
  }
}, {
  url: [{
    urlMatches: 'https?://\w*.?amazon.(at|ca|cn|co.jp|co.uk|com.au|com.br|com.mx|com|de|es|fr|ie|in|it|nl)/\w*'
  }]
});

function interceptRequest(request) {
  if (request && request.url) {
    const sanitizedResult = sanitizeURL(request.url);
    if (sanitizedResult.match) {
      return {
        redirectUrl: sanitizedResult.url
      };
    }
  }
}

function sanitizeURL(urlString) {
  const url = new URL(decodeURIComponent(urlString));
  let match = false;
  const searchParams = url.searchParams;
  if (searchParams.has('tag')) {
    tags.push(searchParams.get('tag'));
    match = true;
  }
  if (searchParams.has('ascsubtag')) {
    tags.push(searchParams.get('ascsubtag'));
    match = true;
  }
  searchParams.delete('tag');
  searchParams.delete('ascsubtag');
  return {
    url: url.toString(),
    match
  };
}

function renderBox() {
  _browser.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    _browser.tabs.sendMessage(tabs[0].id, {
      tags
    }, () => {
      tags = [];
    });
  });

  _browser.tabs.insertCSS({
    file: 'css/style.css'
  });
}
