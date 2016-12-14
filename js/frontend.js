'use strict';

chrome.runtime.onMessage.addListener((request, sender, resetTag) => {
  const div = document.createElement('div');
  div.className = 'amazon-tag-remover';
  div.textContent = `The following tag was found and has been removed: ${request.tag}`;
  document.body.appendChild(div);
  div.classList.toggle('amazon-tag-remover-fade-in');

  setTimeout(() => {
    div.classList.toggle('amazon-tag-remover-fade-in');
    div.classList.toggle('amazon-tag-remover-fade-out');
  }, 7000);
  resetTag();
});
