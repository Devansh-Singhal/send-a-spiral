/* Repeated lettering follows one continuous spiral; photo brightness becomes red. */
function makeSpiral(canvas, text) {
  'use strict';
  const width = 600, height = 780;
  let phrase, points;
  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.width = width; canvas.height = height;
  const sample = document.createElement('canvas');
  sample.width = width; sample.height = height;
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
  let pixels = null, frame = 0, drawn = 0, playing = false, startedAt = 0, elapsed = 0, duration = 11000, generation = 0;
  function clear() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height); drawn = 0; }
  function paint(until) {
    if (!pixels) return;
    ctx.font = '700 7.3px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (; drawn < until; drawn++) {
      const p = points[drawn];
      if (p.x < 1 || p.x >= width - 1 || p.y < 1 || p.y >= height - 1) continue;
      const offset = (Math.floor(p.y) * width + Math.floor(p.x)) * 4;
      const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
      if (Math.max(r, g, b) < 10) continue;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      const red = Math.min(255, Math.round((.299 * r + .587 * g + .114 * b) * 1.6));
      ctx.fillStyle = `rgb(${red},0,0)`; ctx.fillText(phrase[drawn % phrase.length], 0, 0); ctx.restore();
    }
    canvas.dataset.progress = String(drawn / points.length);
  }
  function tick(now) {
    if (!playing || document.hidden) return;
    const progress = Math.min((elapsed + now - startedAt) / duration, 1);
    paint(Math.floor(points.length * progress));
    if (progress < 1) frame = requestAnimationFrame(tick);
    else playing = false;
  }
  function play(ms = 11000) {
    cancelAnimationFrame(frame); clear(); elapsed = 0; duration = ms;
    canvas.dataset.progress = '0'; playing = true; startedAt = performance.now();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { paint(points.length); playing = false; }
    else frame = requestAnimationFrame(tick);
  }
  function still(progress = 0) {
    cancelAnimationFrame(frame); playing = false; clear(); canvas.dataset.progress = '0';
    paint(Math.floor(points.length * progress));
  }
  function setText(value) {
    phrase = Array.from((Spiral.clean(value, 40) || 'I love you') + ' ');
    ctx.font = '700 7.3px Arial, sans-serif';
    points = Spiral.spiralPoints(width, height, phrase.map(letter => ctx.measureText(letter).width + .3));
    canvas.setAttribute('aria-label', 'Your photo drawn in a red spiral of ' + phrase.join('').trim());
    still(0);
  }
  async function load(src, isCurrent = () => true) {
    const version = ++generation;
    const img = new Image();
    img.src = src;
    await img.decode();
    if (version !== generation || !isCurrent()) return;
    sampleCtx.fillStyle = '#000'; sampleCtx.fillRect(0, 0, width, height);
    const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    sampleCtx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    pixels = sampleCtx.getImageData(0, 0, width, height).data;
  }
  document.addEventListener('visibilitychange', () => {
    if (!playing) return;
    if (document.hidden) { elapsed += performance.now() - startedAt; cancelAnimationFrame(frame); }
    else { startedAt = performance.now(); frame = requestAnimationFrame(tick); }
  });
  setText(text);
  return { load, play, still, setText };
}
