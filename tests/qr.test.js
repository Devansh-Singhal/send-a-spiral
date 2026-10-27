const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Spiral = require('../core');
const qrcode = require('../qrcode');

const context = { qrcode };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../heartqr.js'), 'utf8'), context);
const longestLink = Spiral.linkFor('https://send-a-spiral.vercel.app', {
  to: '💕'.repeat(40), from: '💕'.repeat(40), note: '💕'.repeat(140), photo: 'a'.repeat(32)
});

function canvas() {
  let modulesPainted = 0;
  const drawing = {
    fillRect() { modulesPainted++; }, save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, moveTo() {}, arcTo() {}, closePath() {}, fill() {}
  };
  return { getContext: () => drawing, get modulesPainted() { return modulesPainted; } };
}

test('heart QR accepts maximum Unicode personalization when stronger correction levels overflow', () => {
  const image = canvas();
  const result = context.drawHeartQR(image, longestLink);
  assert.ok(result.modules > 0);
  assert.ok(image.modulesPainted > 1);
  assert.equal(image.width, 1000);
  assert.equal(image.height, 1000);
});

test('plain QR falls back to lower correction for maximum Unicode personalization', () => {
  const image = canvas();
  const result = context.drawPlainQR(image, longestLink);
  assert.ok(result.modules > 0);
  assert.ok(image.modulesPainted > 1);
  assert.equal(image.width, 1000);
  assert.equal(image.height, 1000);
});
