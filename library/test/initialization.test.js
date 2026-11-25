const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const bundle = fs.readFileSync(path.join(__dirname, '../dist/p5.posterControl.js'), 'utf8');

function loadPoster(version = 1, rect = { left: 0, top: 0, width: 480, height: 1440 }) {
  const hooks = {};
  const listeners = {};
  const connections = [];
  const drawing = [];
  const styles = [];
  const classes = new Set();
  const intervals = [];
  let animationFrame;
  const debugContext = { fillStyle: '#000' };
  for (const method of ['setTransform', 'clearRect', 'save', 'beginPath', 'rect',
    'clip', 'arc', 'stroke', 'fill', 'restore', 'fillText']) {
    debugContext[method] = (...args) => { drawing.push([method, ...args]); };
  }
  let savedFillStyle;
  debugContext.save = () => {
    drawing.push(['save']);
    savedFillStyle = debugContext.fillStyle;
  };
  debugContext.restore = () => {
    drawing.push(['restore']);
    debugContext.fillStyle = savedFillStyle;
  };
  debugContext.fillText = (...args) => {
    drawing.push(['fillText', ...args, debugContext.fillStyle, debugContext.font]);
  };
  const canvas = {
    width: 480,
    height: 1440,
    style: {},
    getBoundingClientRect: () => rect,
  };
  const document = {
    body: { appendChild() {} },
    documentElement: {
      classList: {
        toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
        remove: (name) => classes.delete(name),
      },
    },
    head: { appendChild: (element) => { styles.push(element); } },
    querySelector: () => canvas,
    addEventListener() {},
    removeEventListener() {},
    createElement: () => ({
      style: {},
      setAttribute() {},
      getContext: () => debugContext,
      remove() { this.removed = true; },
    }),
  };
  const window = {
    width: 480,
    height: 1440,
    innerWidth: 480,
    innerHeight: 1440,
    screen: { height: 2000 },
    addEventListener: (name, handler) => { listeners[name] = handler; },
    removeEventListener() {},
    setInterval: (callback) => { intervals.push(callback); },
    clearInterval() {},
    resizeCanvas() {},
  };
  const p5 = function () {};
  if (version === 2) {
    p5.registerAddon = (addon) => {
      const lifecycles = {};
      addon(p5, p5.prototype, lifecycles);
      hooks.afterSetup = lifecycles.postsetup;
    };
  } else {
    p5.prototype.registerMethod = (name, handler) => { hooks[name] = handler; };
  }
  const WebSocket = class {
    constructor(url) { connections.push(url); }
    close() {}
  };
  const context = {
    console, document, window, p5, WebSocket,
    performance: { now: () => 100 },
    requestAnimationFrame: (callback) => { animationFrame = callback; },
    cancelAnimationFrame() {},
  };
  vm.runInNewContext(bundle, context);
  return {
    hooks, listeners, connections, drawing, styles, classes, intervals, document, window, poster: context.poster,
    drawFrame: () => animationFrame(100),
  };
}

for (const version of [1, 2]) {
  test(`p5 ${version} sketches initialize automatically and respond to pointer movement`, () => {
    const { hooks, listeners, connections, poster } = loadPoster(version);
    hooks.afterSetup();

    assert.deepEqual(connections, ['ws://localhost:8025']);
    listeners.pointermove({ clientX: 120, clientY: 720 });
    assert.equal(poster.position.x, 120);
    assert.equal(poster.position.y, 720);
    assert.equal(poster.posNormal.x, 0.25);
    assert.equal(poster.posNormal.y, 0.5);
  });

  test(`p5 ${version} explicit setup options take precedence over automatic initialization`, () => {
    const { hooks, connections, poster } = loadPoster(version);
    poster.setup({ host: 'example.test', port: 9000, resize: false, debug: false });
    hooks.afterSetup();

    assert.deepEqual(connections, ['ws://example.test:9000']);
  });
}

test('mouse coordinates stay within a scaled, offset canvas', () => {
  const { hooks, listeners, poster } = loadPoster(2, {
    left: 100, top: 200, width: 240, height: 720,
  });
  hooks.afterSetup();

  listeners.pointermove({ clientX: 50, clientY: 1000 });
  assert.equal(poster.position.x, 0);
  assert.equal(poster.position.y, 1440);
  assert.equal(poster.posNormal.x, 0);
  assert.equal(poster.posNormal.y, 1);

  listeners.pointermove({ clientX: 400, clientY: 100 });
  assert.equal(poster.position.x, 480);
  assert.equal(poster.position.y, 0);
  assert.equal(poster.posNormal.x, 1);
  assert.equal(poster.posNormal.y, 0);

  listeners.pointermove({ clientX: 220, clientY: 560 });
  assert.equal(poster.position.x, 240);
  assert.equal(poster.position.y, 720);
});

test('debug marker is clipped to the poster canvas without clipping the FPS', () => {
  const { hooks, drawing, drawFrame } = loadPoster(2, {
    left: 100, top: 200, width: 240, height: 720,
  });
  hooks.afterSetup();
  drawFrame();

  const clip = drawing.findIndex(([method]) => method === 'clip');
  const stroke = drawing.findIndex(([method]) => method === 'stroke');
  const restore = drawing.findIndex(([method]) => method === 'restore');
  const fps = drawing.findIndex(([method]) => method === 'fillText');
  assert.deepEqual(drawing.find(([method]) => method === 'rect'), ['rect', 100, 200, 240, 720]);
  assert.ok(clip >= 0 && clip < stroke && stroke < restore && restore < fps);
  assert.deepEqual(drawing[fps].slice(-2), ['#f00', '12px monospace']);
});

test('fullscreen cursor styling is installed and removed with the library', () => {
  const { hooks, styles, poster } = loadPoster();
  hooks.afterSetup();
  assert.equal(styles.length, 1);
  assert.match(styles[0].textContent, /:fullscreen \*.*cursor:\s*none/);
  poster.closeOSC();
  assert.equal(styles[0].removed, true);
});

test('screen-height canvas hides the overlay and cursor even without a fullscreen element', () => {
  const rect = { left: 0, top: 0, width: 480, height: 1440 };
  const { hooks, drawing, classes, window, document, poster, drawFrame } = loadPoster(2, rect);
  window.screen.height = 1440;
  hooks.afterSetup();
  drawFrame();
  assert.equal(classes.has('poster-control-fullscreen'), true);
  assert.equal(drawing.some(([method]) => method === 'fillText'), false);

  rect.height = 1400;
  drawFrame();
  assert.equal(classes.has('poster-control-fullscreen'), false);
  assert.equal(drawing.some(([method]) => method === 'fillText'), true);

  document.fullscreenElement = {};
  drawFrame();
  assert.equal(classes.has('poster-control-fullscreen'), true);
  poster.closeOSC();
  assert.equal(classes.has('poster-control-fullscreen'), false);
});

test('screen-height cursor state updates even with the debug overlay disabled', () => {
  const rect = { left: 0, top: 0, width: 480, height: 1400 };
  const { intervals, classes, window, poster } = loadPoster(2, rect);
  window.screen.height = 1440;
  poster.setup({ resize: false, debug: false });
  assert.equal(classes.has('poster-control-fullscreen'), false);

  rect.height = 1439.5;
  intervals[1]();
  assert.equal(classes.has('poster-control-fullscreen'), true);
  rect.height = 1438;
  intervals[1]();
  assert.equal(classes.has('poster-control-fullscreen'), false);
});
