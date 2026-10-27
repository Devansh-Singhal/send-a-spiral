(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('preview') === '1') return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.va('beforeSend', event => Object.assign({}, event, { url: String(event.url).split(/[?#]/)[0] }));
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();
