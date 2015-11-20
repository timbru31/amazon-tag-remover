'use strict';

chrome.runtime.onMessage.addListener((request, sender, resetTag) => {
  let div = document.createElement('div');
  div.className = 'amazon-tag-remover';
  div.innerText = `The following tag was found and has been removed: ${request.tag}`;
  document.body.appendChild(div);
  div.classList.add('amazon-tag-remover-fade-in');

  setTimeout(() => {
    div.classList.remove('amazon-tag-remover-fade-in');
    div.classList.add('amazon-tag-remover-fade-out');
  }, 7000);
  resetTag();
});
