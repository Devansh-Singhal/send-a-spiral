const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const corePath = path.join(__dirname, '../core.js');
const Spiral = fs.existsSync(corePath) ? require(corePath) : {};

test('gift links preserve Unicode, punctuation and a valid short photo identifier', () => {
  assert.equal(typeof Spiral.linkFor, 'function');
  const gift = { to: 'Love 💕 & $& <you>', from: 'Jo 李', note: 'A note? #yes / always', photo: 'a'.repeat(32) };
  const url = new URL(Spiral.linkFor('https://gift.test', gift));
  assert.equal(url.pathname, '/f');
  assert.deepEqual(Spiral.readGift(url.searchParams), gift);
  assert.ok(url.href.length < 400);
});

test('spiral starts at the centre and grows continuously outwards', () => {
  assert.equal(typeof Spiral.spiralPoints, 'function');
  const points = Spiral.spiralPoints(360, 480);
  assert.ok(points.length > 5000);
  assert.ok(Math.hypot(points[0].x - 180, points[0].y - 240) < 5);
  for (let i = 1; i < points.length; i++) {
    assert.ok(points[i].radius >= points[i - 1].radius);
    assert.ok(Number.isFinite(points[i].angle));
  }
  assert.ok(points.at(-1).radius >= 300);
});

test('personalization is bounded without splitting emoji and rejects photo paths', () => {
  assert.equal(typeof Spiral.clean, 'function');
  assert.equal(Spiral.clean('💕'.repeat(45), 40), '💕'.repeat(40));
  assert.equal(Spiral.readGift(new URLSearchParams({p:'../../private'})).photo, '');
});
