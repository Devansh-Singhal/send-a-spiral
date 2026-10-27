const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const photo = require('../photo');

function crop(width, height, selection) {
  assert.equal(typeof photo.photoCrop, 'function');
  return photo.photoCrop(width, height, selection);
}

test('the default crop preserves the full original image without imposing an aspect ratio', () => {
  assert.deepEqual(crop(1000, 2000), { x: 0, y: 0, width: 1000, height: 2000 });
  assert.deepEqual(crop(2600, 1300), { x: 0, y: 0, width: 2600, height: 1300 });
});

test('a wide crop retains independently selected width and height', () => {
  assert.deepEqual(crop(1000, 2000, { x: 0.1, y: 0.25, width: 0.8, height: 0.2 }), { x: 100, y: 500, width: 800, height: 400 });
});

test('tall and square crops keep their chosen proportions', () => {
  assert.deepEqual(crop(1000, 2000, { x: 0.2, y: 0.1, width: 0.4, height: 0.8 }), { x: 200, y: 200, width: 400, height: 1600 });
  assert.deepEqual(crop(1000, 2000, { x: 0.1, y: 0.2, width: 0.6, height: 0.3 }), { x: 100, y: 400, width: 600, height: 600 });
});

test('the top-left corner stops at image edges while preserving crop dimensions', () => {
  assert.deepEqual(crop(1000, 2000, { x: -0.2, y: -1, width: 0.5, height: 0.25 }), { x: 0, y: 0, width: 500, height: 500 });
  assert.deepEqual(crop(1000, 2000, { x: 2, y: 1, width: 0.5, height: 0.25 }), { x: 500, y: 1500, width: 500, height: 500 });
});

test('crop dimensions clamp independently between one source pixel and the full image', () => {
  assert.deepEqual(crop(1000, 2000, { x: 0, y: 0, width: 2, height: 0.25 }), { x: 0, y: 0, width: 1000, height: 500 });
  assert.deepEqual(crop(1000, 2000, { x: 1, y: 1, width: 0, height: -1 }), { x: 999, y: 1999, width: 1, height: 1 });
});

const source = fs.readFileSync(path.join(__dirname, '../photo.js'), 'utf8');
const jpeg = 'data:image/jpeg;base64,cHJvY2Vzc2Vk';
const file = { type: 'image/png', size: 1000 };

function browserPhoto({ outputs = [jpeg], decodeError = false } = {}) {
  const draws = [], encodings = [], revoked = [];
  const canvas = {
    width: 0, height: 0,
    getContext() { return { fillRect() {}, drawImage(...args) { draws.push(args); } }; },
    toDataURL(type, quality) {
      encodings.push({ type, quality, width: this.width, height: this.height });
      return outputs[Math.min(encodings.length - 1, outputs.length - 1)];
    }
  };
  const environment = {
    URL: { createObjectURL() { return 'blob:original-photo'; }, revokeObjectURL(url) { revoked.push(url); } },
    Image: class {
      naturalWidth = 1000;
      naturalHeight = 2000;
      async decode() { if (decodeError) throw new Error('decode failed'); }
    },
    document: { createElement(tag) { assert.equal(tag, 'canvas'); return canvas; } }
  };
  vm.runInNewContext(source, environment);
  return { prepare: environment.preparePhoto, crop: environment.photoCrop, draws, encodings, revoked };
}

test('photo preparation crops original source pixels into a JPEG with the selected wide aspect ratio', async () => {
  const browser = browserPhoto();
  const result = await browser.prepare(file, { x: 0.1, y: 0.25, width: 0.8, height: 0.2 });
  assert.equal(result, jpeg);
  assert.equal(browser.draws.length, 1);
  assert.equal(browser.draws[0][0].src, 'blob:original-photo');
  assert.deepEqual(browser.draws[0].slice(1), [100, 500, 800, 400, 0, 0, 800, 400]);
  assert.deepEqual(browser.encodings, [{ type: 'image/jpeg', quality: 0.88, width: 800, height: 400 }]);
  assert.deepEqual(browser.revoked, ['blob:original-photo']);
  assert.equal(typeof browser.crop, 'function', 'the crop helper must also be available to browser callers');
  assert.equal(typeof photo.preparePhoto, 'function', 'Node callers must receive the same photo preparation API');
});

test('large tall crops resize proportionally while square crops remain square', async () => {
  const tall = browserPhoto();
  await tall.prepare(file, { x: 0.2, y: 0.1, width: 0.4, height: 0.8 });
  assert.deepEqual(tall.draws[0].slice(1), [200, 200, 400, 1600, 0, 0, 250, 1000]);
  const square = browserPhoto();
  await square.prepare(file, { x: 0.1, y: 0.2, width: 0.6, height: 0.3 });
  assert.deepEqual(square.draws[0].slice(1), [100, 400, 600, 600, 0, 0, 600, 600]);
});

test('a null selection keeps the existing full-photo resize behavior', async () => {
  const browser = browserPhoto();
  assert.equal(await browser.prepare(file, null), jpeg);
  assert.deepEqual(browser.draws[0].slice(1), [0, 0, 500, 1000]);
  assert.deepEqual(browser.encodings, [{ type: 'image/jpeg', quality: 0.88, width: 500, height: 1000 }]);
  assert.deepEqual(browser.revoked, ['blob:original-photo']);
});

test('cropped JPEGs still retry compression to fit the upload limit', async () => {
  const browser = browserPhoto({ outputs: ['x'.repeat(680001), jpeg] });
  assert.equal(await browser.prepare(file, { x: 0.1, y: 0.25, width: 0.8, height: 0.2 }), jpeg);
  assert.deepEqual(browser.encodings.map(encoding => encoding.quality), [0.88, 0.72]);
  assert.deepEqual(browser.revoked, ['blob:original-photo']);
});

test('a crop that cannot fit the size limit reports the existing error and releases the source URL', async () => {
  const browser = browserPhoto({ outputs: ['x'.repeat(680001)] });
  await assert.rejects(browser.prepare(file, { x: 0.1, y: 0.25, width: 0.8, height: 0.2 }), /too detailed to send/);
  assert.deepEqual(browser.encodings.map(encoding => encoding.quality), [0.88, 0.72, 0.5]);
  assert.deepEqual(browser.revoked, ['blob:original-photo']);
});

test('an undecodable cropped photo reports the existing error and releases the source URL', async () => {
  const browser = browserPhoto({ decodeError: true });
  await assert.rejects(browser.prepare(file, { x: 0.1, y: 0.25, width: 0.8, height: 0.2 }), /could not open/);
  assert.equal(browser.draws.length, 0);
  assert.deepEqual(browser.revoked, ['blob:original-photo']);
});
