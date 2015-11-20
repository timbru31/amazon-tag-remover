'use strict';

chrome.runtime.onMessage.addListener(request => {
  let div = document.createElement('div');
  div.className = 'amazon-tag-remover';
  div.innerText = `The following tag was found and has been removed: ${request.tag}`;
  document.body.appendChild(div);

  setTimeout(() => {
    document.body.removeChild(div);
  }, 5000);
});
