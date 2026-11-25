# OSC position helper

A small browser library for using an OSC `x`, `y`, and optional `z` position in
p5.js sketches.

## Install and build

```bash
npm install
npm run build
```

Use `npm start` for the development server. It selects an available port and
prints the local URL in the terminal.

## Use

Load `dist/p5.posterControl.js` after p5.js and before your sketch:

```html
<script src="p5.min.js"></script>
<script src="p5.posterControl.js"></script>
<script src="sketch.js"></script>
```

The library initializes automatically after p5's setup with p5.js 1.x and 2.x,
including for older sketches. To customize its options, call `poster.setup()`
from p5's setup:

```js
function setup() {
  createCanvas(windowWidth, windowHeight);
  poster.setup({ resize: true });
}

function draw() {
  const { x, y, z } = poster.position;
  circle(x, y, z * 100);
}
```

By default the library draws a red position point, a red `z` radius ring, and
FPS in the top-left corner. The overlay is automatically hidden in fullscreen:

```js
poster.setup({ debug: false }); // disable the overlay entirely
```

The mouse pointer is also hidden while the page is fullscreen. For browser
fullscreen and embedded posters, a canvas whose displayed height matches the
screen height (within one CSS pixel) is also treated as fullscreen.

After the canvas is created, the library records its original aspect ratio.
It automatically fits the canvas inside the viewport on window and fullscreen
changes without stretching it. Set `resize: false` to keep the original canvas
dimensions.

The public position API is:

```js
poster.position.x;   // tracked position in canvas pixels
poster.position.y;
poster.posNormal.x;  // same position normalized to 0..1
poster.posNormal.y;
poster.vw;           // 1% of canvas width
poster.vh;           // 1% of canvas height
```

`poster.x`, `poster.y`, and `poster.z` are also normalized convenience values.
Use `poster.hasOSCSignal()` to check whether a position was received recently.

It connects to `ws://localhost:8025`. Without a fresh OSC signal,
`poster.position.x` and `poster.position.y` follow the mouse, clamped to the
canvas bounds.
The library continues checking for restored OSC connections and immediately
resumes OSC control when a new position arrives.

To change the WebSocket endpoint, pass options to `poster.setup()`:

```js
poster.setup({
  host: 'localhost',
  port: 9000,
  address: '/position',
  retryInterval: 2000,
  signalTimeout: 2000,
  resize: false
});
```

## OSC messages

The preferred message is:

```text
/position <float x> <float y> [float z]
```

Separate `/x`, `/y`, and `/z` messages containing one float are supported too.
Legacy `/depth` messages are accepted when the values occupy arguments 4-6;
image data is ignored.
