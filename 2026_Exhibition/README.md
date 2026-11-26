# Reactive Signs 2026 — Exhibition

A single poster running full-screen. It is controlled by the **mouse**, and
automatically by **pose tracking** (OSC) when `cameraPoseOSC` is running — no
change needed to switch between the two, the poster library handles it.

## Run

Serve this folder over HTTP (the poster loads fonts and libraries, so
`file://` will not work) and open `index.html`. For example:

```bash
cd 2026_Exhibition
python3 -m http.server 8000
# then open http://localhost:8000
```

Use the browser's full-screen (e.g. F11) to show it as a kiosk.

## Infinity room preview

`InfinityRoom/index.html` is a 3D preview of the mirrored exhibition room
(5 × 5 × 3 m, four screens, mirror reflections). It renders the **example
poster** (the `Example` tunnel) onto all four screens, so you see how the
poster reads in the physical space before the show. Three.js is loaded from a
CDN; otherwise it runs on its own:

```
http://localhost:8000/InfinityRoom/
```

You can switch each screen to one of the procedural animations, change camera
views, toggle the mirror and the black-and-white mode, and export a PNG.

The poster and both previews share the dimensions in `poster-dimensions.js`
(currently 480 × 1200 pixels). Edit that file to change the screen size; the
poster and tracking preview scale down to fit smaller windows.

## Structure

- `index.html` — the exhibition shell (one full-screen poster).
- `styles.css` — layout and sizing for the shell.
- `poster-dimensions.js` — shared poster width and height in pixels.
- `Teams/Example/` — the starting point students write their poster in.
- `Teams/libraries/` — `p5.min.js` and `p5.posterControl.js`.
- `InfinityRoom/index.html` — 3D mirrored-room preview of the exhibition space.

## Where students write their code

Each team works inside their own folder, **`Teams/Team1/`** … **`Teams/Team5/`**
— edit `sketch.js` (and `index.html` if you add assets). `Teams/Example/`
is the untouched reference example. To add more teams, copy `Teams/Example`
to `Teams/TeamN/` and add it to [`teams.js`](teams.js).

A sketch only needs `setup()` and `draw()`. Call `createPosterCanvas()` in
`setup()` — it creates the correctly-sized canvas, connects tracking, and
handles window resizing for you:

```javascript
function setup() {
  createPosterCanvas();
}

function draw() {
  background(0);
  circle(poster.position.x, poster.position.y, poster.vw * 20);
}
```

Inside `draw()` you have the library variables:

```javascript
poster.position.x/.y  // tracked position (mouse fallback)
poster.posNormal.x/.y // same, normalised 0..1
poster.vw / poster.vh // 1% of viewport width / height
```

## Presentation mode

Open the exhibition `index.html` and switch between team posters by keyboard:
**← / →** to step through them, **number keys 1–9** to jump to a team. The team
list lives in [`teams.js`](teams.js). The same list feeds the Infinity Room,
where each screen can show any team's poster running live.
