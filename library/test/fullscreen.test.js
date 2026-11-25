const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../demo/demo_poster_simple/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function loadControls() {
  const events = {};
  const attributes = {};
  const button = {
    textContent: 'Enter fullscreen',
    addEventListener: (name, handler) => { events[name] = handler; },
    setAttribute: (name, value) => { attributes[name] = value; },
  };
  const error = { textContent: '' };
  const document = {
    fullscreenElement: null,
    documentElement: {},
    getElementById: (id) => id === 'fullscreen-button' ? button : error,
    addEventListener: (name, handler) => { events[name] = handler; },
  };
  document.documentElement.requestFullscreen = async () => {
    document.fullscreenElement = document.documentElement;
    events.fullscreenchange();
  };
  document.exitFullscreen = async () => {
    document.fullscreenElement = null;
    events.fullscreenchange();
  };
  const errors = [];
  vm.runInNewContext(script, { document, console: { error: (...args) => errors.push(args) } });
  return { button, error, document, events, attributes, errors };
}

test('fullscreen button enters, exits, and reflects external exits', async () => {
  const { button, document, events, attributes } = loadControls();
  await events.click();
  assert.equal(document.fullscreenElement, document.documentElement);
  assert.equal(button.textContent, 'Exit fullscreen');
  assert.equal(attributes['aria-pressed'], 'true');

  await events.click();
  assert.equal(document.fullscreenElement, null);
  assert.equal(button.textContent, 'Enter fullscreen');
  assert.equal(attributes['aria-pressed'], 'false');

  await events.click();
  document.fullscreenElement = null;
  events.fullscreenchange();
  assert.equal(button.textContent, 'Enter fullscreen');
});

test('fullscreen request failures are displayed', async () => {
  const { document, events, error, errors } = loadControls();
  document.documentElement.requestFullscreen = async () => { throw new Error('denied'); };
  await events.click();
  assert.equal(error.textContent, 'Could not change fullscreen mode.');
  assert.equal(errors.length, 1);
});
