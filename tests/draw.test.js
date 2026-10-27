const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Spiral = require('../core');

const source = fs.readFileSync(path.join(__dirname, '../draw.js'), 'utf8');
const photoPixel = (x, y) => [20 + x % 200, 30 + y % 200, 40 + (x + y) % 180];

function drawing({ reduced = false, pixel = photoPixel } = {}) {
  let now = 0, nextFrame = 0;
  const frames = new Map(), listeners = new Map();
  function canvas() {
    const element = { width: 0, height: 0, dataset: {} };
    const stack = [];
    const context = {
      fillStyle: '#000', x: 0, y: 0, angle: 0, glyphs: [], clears: 0, image: null,
      measureText(char) { return {width: char === 'I' || char === 'l' || char === ' ' ? 2 : 4}; },
      fillRect(x, y, width, height) {
        assert.deepEqual([x, y, width, height], [0, 0, element.width, element.height]);
        this.glyphs = []; this.image = null; this.clears++;
      },
      drawImage(image, x, y, width, height) { this.image = { image, x, y, width, height }; },
      getImageData(x, y, width, height) {
        const data = new Uint8ClampedArray(width * height * 4);
        const layer = this.image;
        for (let py = 0; py < height; py++) {
          for (let px = 0; px < width; px++) {
            const offset = (py * width + px) * 4;
            if (layer && px >= layer.x && px < layer.x + layer.width && py >= layer.y && py < layer.y + layer.height) {
              const ix = Math.floor((px - layer.x) * layer.image.naturalWidth / layer.width);
              const iy = Math.floor((py - layer.y) * layer.image.naturalHeight / layer.height);
              data.set(layer.image.pixel(ix, iy), offset);
            }
            data[offset + 3] = 255;
          }
        }
        return { data };
      },
      save() { stack.push({ fillStyle: this.fillStyle, x: this.x, y: this.y, angle: this.angle }); },
      restore() { Object.assign(this, stack.pop()); },
      translate(x, y) { this.x += x; this.y += y; },
      rotate(angle) { this.angle += angle; },
      fillText(text, x, y) { this.glyphs.push({ text, x: this.x + x, y: this.y + y, angle: this.angle, color: this.fillStyle }); }
    };
    element.getContext = () => context;
    element.context = context;
    return element;
  }
  const output = canvas();
  const document = {
    hidden: false,
    createElement(tag) { assert.equal(tag, 'canvas'); return canvas(); },
    addEventListener(event, listener) { listeners.set(event, listener); }
  };
  const environment = {
    Spiral, document, performance: { now: () => now },
    matchMedia: () => ({ matches: reduced }),
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    Image: class {
      naturalWidth = 600;
      naturalHeight = 780;
      pixel = pixel;
      decode() { return Promise.resolve(); }
    }
  };
  vm.runInNewContext(source, environment);
  const api = environment.makeSpiral(output);
  return {
    api, canvas: output, context: output.context,
    pendingFrames: () => frames.size,
    frameAt(time) {
      now = time;
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(now);
    },
    hidden(value) { document.hidden = value; listeners.get('visibilitychange')(); }
  };
}

test('loading a photo leaves the canvas at zero progress, including reduced motion', async () => {
  for (const reduced of [false, true]) {
    const view = drawing({ reduced });
    assert.equal(view.canvas.dataset.progress, '0');
    assert.equal(view.context.glyphs.length, 0);
    await view.api.load('synthetic-photo');
    view.frameAt(20000);
    assert.equal(view.canvas.dataset.progress, '0');
    assert.equal(view.context.glyphs.length, 0);
    assert.equal(view.pendingFrames(), 0);
  }
});

test('play starts at zero and draws outward in red with intensity from photo brightness', async () => {
  const grayscalePixel = (x, y) => Array(3).fill(20 + (x + y) % 120);
  const view = drawing({ pixel: grayscalePixel });
  await view.api.load('synthetic-photo');
  view.api.play(1000);
  view.frameAt(0);
  assert.equal(view.canvas.dataset.progress, '0');
  assert.equal(view.context.glyphs.length, 0);

  view.frameAt(250);
  const glyphs = view.context.glyphs;
  assert.ok(glyphs.length > 100);
  assert.ok(Number(view.canvas.dataset.progress) > 0);
  assert.ok(Number(view.canvas.dataset.progress) < 1);
  assert.ok(Math.hypot(glyphs[0].x - 300, glyphs[0].y - 390) < 5);
  let previousRadius = 0;
  const colors = new Set();
  const intensities = new Map();
  for (const glyph of glyphs) {
    const radius = Math.hypot(glyph.x - 300, glyph.y - 390);
    assert.ok(radius >= previousRadius - 1e-9, 'letters must keep moving outward');
    previousRadius = radius;
    const channels = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(glyph.color);
    assert.ok(channels, 'a letter must use an RGB color');
    const [red, green, blue] = channels.slice(1).map(Number);
    assert.equal(green, 0, 'letters must contain no green');
    assert.equal(blue, 0, 'letters must contain no blue');
    assert.ok(red > 0 && red <= 255);
    const brightness = grayscalePixel(Math.floor(glyph.x), Math.floor(glyph.y))[0];
    if (intensities.has(brightness)) assert.equal(red, intensities.get(brightness), 'equal source brightness must produce equal red');
    intensities.set(brightness, red);
    colors.add(glyph.color);
  }
  assert.ok(previousRadius > 100);
  assert.ok(colors.size > 100, 'red intensity must vary with the photo');
  const levels = [...intensities].sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i][1] > levels[i - 1][1], 'brighter source pixels must produce stronger red');
  }
});

test('replay clears the old letters and restarts progress at the center', async () => {
  const view = drawing();
  await view.api.load('synthetic-photo');
  view.api.play(1000);
  view.frameAt(400);
  const first = { ...view.context.glyphs[0] };
  const previousCount = view.context.glyphs.length;
  const previousClears = view.context.clears;
  view.api.play(1000);
  assert.equal(view.canvas.dataset.progress, '0');
  assert.equal(view.context.glyphs.length, 0);
  assert.equal(view.context.clears, previousClears + 1);
  assert.equal(view.pendingFrames(), 1);
  view.frameAt(400);
  assert.equal(view.context.glyphs.length, 0);
  view.frameAt(500);
  assert.deepEqual(view.context.glyphs[0], first);
  assert.ok(view.context.glyphs.length < previousCount);
  assert.ok(Number(view.canvas.dataset.progress) <= 0.1);
});

test('reduced motion renders fully on play or still(1), while still(0) clears it', async () => {
  const view = drawing({ reduced: true });
  await view.api.load('synthetic-photo');
  view.api.still(0.25);
  const partialCount = view.context.glyphs.length;
  assert.ok(partialCount > 0);
  assert.ok(Number(view.canvas.dataset.progress) < 1);
  view.api.still(0);
  assert.equal(view.canvas.dataset.progress, '0');
  assert.equal(view.context.glyphs.length, 0);
  view.api.play();
  assert.equal(view.canvas.dataset.progress, '1');
  assert.ok(view.context.glyphs.length > partialCount);
  const fullCount = view.context.glyphs.length;
  assert.equal(view.pendingFrames(), 0);
  view.api.still();
  assert.equal(view.canvas.dataset.progress, '0');
  assert.equal(view.context.glyphs.length, 0);
  view.api.still(1);
  assert.equal(view.canvas.dataset.progress, '1');
  assert.equal(view.context.glyphs.length, fullCount);
  assert.equal(view.pendingFrames(), 0);
});

test('a hidden tab pauses the reveal and resumes without counting hidden time', async () => {
  const view = drawing();
  await view.api.load('synthetic-photo');
  view.api.play(1000);
  view.frameAt(250);
  const progress = view.canvas.dataset.progress;
  const count = view.context.glyphs.length;
  view.hidden(true);
  assert.equal(view.pendingFrames(), 0);
  view.frameAt(5250);
  assert.equal(view.canvas.dataset.progress, progress);
  assert.equal(view.context.glyphs.length, count);
  view.hidden(false);
  view.frameAt(5250);
  assert.equal(view.canvas.dataset.progress, progress);
  assert.equal(view.context.glyphs.length, count);
  view.frameAt(5500);
  assert.ok(Number(view.canvas.dataset.progress) > 0.49);
  assert.ok(Number(view.canvas.dataset.progress) <= 0.5);
});
