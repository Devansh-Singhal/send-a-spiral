(function (root) {
  'use strict';
  const clean = (value, max) => Array.from(String(value || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()).slice(0, max).join('');
  const photoId = value => /^[a-f0-9]{32}$/.test(value || '') ? value : '';
  function readGift(params) {
    return { to: clean(params.get('t'), 40), from: clean(params.get('f'), 40), note: clean(params.get('n'), 140), photo: photoId(params.get('p')) };
  }
  function linkFor(origin, gift) {
    const params = new URLSearchParams({ t: clean(gift.to, 40), p: photoId(gift.photo) });
    if (clean(gift.from, 40)) params.set('f', clean(gift.from, 40));
    if (clean(gift.note, 140)) params.set('n', clean(gift.note, 140));
    return origin + '/f?' + params;
  }
  function spiralPoints(width, height) {
    const points = [], pitch = 8.4, advance = 3.1;
    const b = pitch / (2 * Math.PI), limit = Math.hypot(width, height) / 2;
    for (let theta = 0, radius = 2; radius <= limit + advance; theta += advance / Math.sqrt(radius * radius + b * b), radius = 2 + b * theta) {
      points.push({ x: width / 2 + radius * Math.cos(theta), y: height / 2 + radius * Math.sin(theta), radius, angle: theta + Math.atan2(radius, b) });
    }
    return points;
  }
  const api = { clean, photoId, readGift, linkFor, spiralPoints };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Spiral = api;
})(typeof window !== 'undefined' ? window : globalThis);
