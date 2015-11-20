'use strict';
let tag;

const appendedRegex = /&tag=\w+-\d{2}/g;
const leadingRegex = /\?tag=\w+-\d{2}/g;
const leadingRegexWithAppendix = /tag=\w+-\d{2}&/g;
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
  '*://*.amazon.nl/*',
  '*://*.amzn.to/*'
];

// Intercept requests from amazon
chrome.webRequest.onBeforeRequest.addListener(interceptRequest, {
  'urls': amazonURLs
}, ['blocking']);

// When request is completed, render the box
chrome.webNavigation.onCompleted.addListener(details => {
  if (tag) {
    renderBox();
  }
}, {
  url: [{
    urlMatches: 'https?://\w*.?amazon.(at|ca|cn|co.jp|co.uk|com.au|com.br|com.mx|com|de|es|fr|ie|in|it|nl)/\w*'
  }]
});


function interceptRequest(request) {
  if (request && request.url) {
    return {
      redirectUrl: analyzeURL(request.url)
    };
  }
}

// If the URL is shortened use longurl to expand
function analyzeURL(url) {
  if (url.indexOf('amzn.to') > -1) {
    return expandURL(url);
  } else {
    return sanitizeURL(url);
  }
}

// Expand URL via longurl.org
function expandURL(shortURL) {
  shortURL = encodeURIComponent(shortURL);
  let longURL = `http://api.longurl.org/v2/expand?${shortURL}&format=json&user-agent=Amazon-Tag-Remover%2v0.1`;
  chrome.runtime.sendMessage({
    method: 'GET',
    action: 'xhttp',
    url: longURL
  }, responseText => {
    if (responseText) {
      let url = JSON.parse(responseText)['long-url'];
      return sanitizeURL(url);
    }
  });
}

// Strip tag from URL
function sanitizeURL(url) {
  url = decodeURIComponent(url);
  let matches = appendedRegex.exec(url);
  if (matches) {
    url = url.replace(appendedRegex, '');
    tag = matches[0].replace('&tag=', '');
  } else {
    matches = leadingRegex.exec(url);
    if (matches) {
      tag = matches[0].replace('?tag=', '');
      // determine if it ends with ?tag
      if (url.endsWith(matches[0])) {
        url = url.replace(leadingRegex, '');
      } else {
        url = url.replace(leadingRegexWithAppendix, '');
      }
    }
  }
  return url;
}

function renderBox() {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {
      tag: tag
    }, () => {
      tag = undefined;
    });
  });

  // add CSS
  chrome.tabs.insertCSS({
    file: 'css/style.css'
  });
}
