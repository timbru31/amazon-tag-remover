chrome.extension.onRequest.addListener(renderCSS);

function renderCSS(request, sender, callback) {
  var css = '.amazon-tag-remover{right:20px;bottom:15px;background:#2C3539;color:#fff;border:2px solid #fff;opacity:.95;padding:7px 10px;position:fixed;z-index:2147483647;-webkit-border-radius:5px;-webkit-box-shadow:0 0 20px #000;text-align:left}',
  head = document.head || document.getElementsByTagName('head')[0],
  style = document.createElement('style');

  style.type = 'text/css';
  if (style.styleSheet){
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }

  head.appendChild(style);
  renderBox("test")
}

function renderBox(tagName) {
  document.body.innerHTML += '<div class="amazon-tag-remover"><span>' + tagName + '</span></div>'
}
