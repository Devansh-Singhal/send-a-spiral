const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../analytics.js'), 'utf8');

function analytics(search = '') {
  const scripts = [];
  const environment = {
    URLSearchParams, location: { search }, window: {},
    document: {
      createElement(tag) { assert.equal(tag, 'script'); return {}; },
      head: { appendChild(script) { scripts.push(script); } }
    }
  };
  vm.runInNewContext(source, environment);
  return { window: environment.window, scripts };
}

test('analytics removes recipient, photo and fragment data before sending events', () => {
  const { window, scripts } = analytics('?t=Recipient&p=' + 'a'.repeat(32));
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, '/_vercel/insights/script.js');
  const [command, filter] = window.vaq[0];
  assert.equal(command, 'beforeSend');
  for (const suffix of ['?t=Recipient&p=' + 'a'.repeat(32) + '#private-note', '#private-note?t=Recipient']) {
    const event = { url: 'https://gift.test/f' + suffix, type: 'pageview' };
    const filtered = filter(event);
    assert.equal(filtered.url, 'https://gift.test/f');
    assert.equal(filtered.type, 'pageview');
    assert.equal(event.url, 'https://gift.test/f' + suffix, 'filtering must not mutate the source event');
  }
});

test('preview=1 does not load analytics or queue a tracking event', () => {
  const { window, scripts } = analytics('?t=Recipient&preview=1&p=' + 'a'.repeat(32));
  assert.equal(scripts.length, 0);
  assert.equal(window.va, undefined);
  assert.equal(window.vaq, undefined);
});
