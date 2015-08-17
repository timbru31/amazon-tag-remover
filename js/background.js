chrome.webRequest.onBeforeRequest.addListener(interceptRequest, {"urls": ["<all_urls>"]}, ['blocking']);
chrome.webNavigation.onDOMContentLoaded.addListener(function(details) {
  var box = 'document.body.innerHTML += "div class=&quot;amazon-tag-remover&quot;><span>no-tag</span></div>"'
  chrome.tabs.insertCSS(details.tabId, {
    code: '.amazon-tag-remover{right:20px;bottom:15px;background:#2C3539;color:#fff;border:2px solid #fff;opacity:.95;padding:7px 10px;position:fixed;z-index:2147483647;-webkit-border-radius:5px;-webkit-box-shadow:0 0 20px #000;text-align:left}'
  });
  // chrome.tabs.executeScript(details.tabId, {
  //   code: box
  // });
  //chrome.tabs.executeScript(null, {file: "js/frontend.js"});
}, {"urls": ["<all_urls>"]});



function interceptRequest(request) {
  if (request && request.url) {
    return { redirectUrl: analyzeURL(request.url) }
  }
}

function analyzeURL(url) {
  if (url.indexOf("amzn.to") > -1) {
    return expandURL(url);
  } else {
    return sanitizeURL(url)
  }
}

function expandURL(shortURL) {
  var longURL = "http://api.longurl.org/v2/expand?" + shortURL + "&format=json&user-agent=Amazon-Tag-Remover%2F1.0"
  chrome.runtime.sendMessage({
      method: 'GET',
      action: 'xhttp',
      url: longURL,
  }, function(responseText) {
      if (responseText) {
        var url = JSON.parse(responseText)['long-url'];
        return sanitizeURL(url);
      }
  });

}

function sanitizeURL(url) {
  //renderCSS();
  if (url.indexOf("&tag=") > -1) {
    url  = url.replace(/&tag=\w+-\d{2}/g, '');
    //renderBox("No tag found");
  } else if (url.indexOf("%26tag%3D") > -1) {
    url  = url.replace(/%26tag%3D\w+-\d{2}/g, '');
    //renderBox("No tag found");
  } else {
    //renderBox("No tag found");
  }
  return url;
}



chrome.runtime.onMessage.addListener(function(request, sender, callback) {
    if (request.action == "xhttp") {
        var xhttp = new XMLHttpRequest();

        xhttp.onload = function() {
            callback(xhttp.responseText);
        };
        xhttp.onerror = function() {
            // Do whatever you want on error. Don't forget to invoke the
            // callback to clean up the communication port.
            console.log("error")
            callback();
        };
        xhttp.open('GET', request.url, true);
        xhttp.send(null);
        return true; // prevents the callback from being called too early on return
    }
});
