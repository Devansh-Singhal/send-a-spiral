const fs = require('node:fs');
const path = require('node:path');
const { readGift } = require('../core');
const template = fs.readFileSync(path.join(__dirname, '../spiral.html'), 'utf8');
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
module.exports = (req, res) => {
  const gift = readGift(new URL(req.url, 'https://local.test').searchParams);
  const title = gift.to ? 'A spiral for ' + gift.to : 'A spiral for you';
  const description = gift.from ? 'From ' + gift.from + '. A photo made of love. Tap to open.' : 'Someone made you a little surprise. Tap to open.';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const origin = /^[a-z0-9.-]+(?::\d+)?$/i.test(host) ? 'https://' + host : '';
  const meta = `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:image" content="${origin}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="robots" content="noindex">`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(template.replace('<!--META-->', () => meta).replace('<!--GATE_NAME-->', () => escape(gift.to || 'for you')));
};
