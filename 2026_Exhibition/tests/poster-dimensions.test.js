const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const config = fs.readFileSync(path.join(root, "poster-dimensions.js"), "utf8");
const sketch = fs.readFileSync(path.join(root, "Poster/Template/sketch.js"), "utf8");

function createSketch(viewportWidth, viewportHeight) {
  const properties = {};
  const calls = [];
  const context = {
    window: {},
    document: {
      documentElement: {
        style: { setProperty: (name, value) => { properties[name] = String(value); } },
      },
    },
    windowWidth: viewportWidth,
    windowHeight: viewportHeight,
    poster: {
      position: { x: 0, y: 0 },
      setup: (options) => { calls.push(["setup", options.resize]); },
    },
    createCanvas: (width, height) => {
      context.width = width;
      context.height = height;
      calls.push(["create", width, height]);
    },
    resizeCanvas: (width, height) => {
      context.width = width;
      context.height = height;
      calls.push(["resize", width, height]);
    },
    createGraphics: () => ({}),
    noStroke() {},
  };
  vm.createContext(context);
  vm.runInContext(config, context);
  vm.runInContext(sketch, context);
  return { context, calls, properties };
}

test("poster and CSS dimensions follow the shared configuration", () => {
  const { context, calls, properties } = createSketch(1000, 1800);
  context.setup();
  const { width, height } = context.window.posterDimensions;
  assert.deepEqual(calls, [["create", width, height], ["setup", false]]);
  assert.equal(properties["--poster-width"], `${width}px`);
  assert.equal(properties["--poster-height"], `${height}px`);
  assert.equal(Number(properties["--poster-aspect"]), width / height);
});

test("poster scales to fit and updates when the window changes", () => {
  const { context, calls } = createSketch(240, 1000);
  context.setup();
  const { width, height } = context.window.posterDimensions;
  assert.deepEqual(calls[0], ["create", 240, Math.floor(height * 240 / width)]);

  context.windowWidth = 1000;
  context.windowHeight = 600;
  context.windowResized();
  assert.deepEqual(calls[2], ["resize", Math.floor(width * 600 / height), 600]);
});
