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
poster** (the `Template` tunnel) onto all four screens, so you see how the
poster reads in the physical space before the show. Three.js is loaded from a
CDN; otherwise it runs on its own:

```
http://localhost:8000/InfinityRoom/
```

You can switch each screen to one of the procedural animations, change camera
views, toggle the mirror and the black-and-white mode, and export a PNG.

## Structure

- `index.html` — the exhibition shell (one full-screen poster).
- `styles.css` — layout and sizing for the shell.
- `Poster/Template/` — the starting point students write their poster in.
- `Poster/libraries/` — `p5.min.js` and `p5.posterControl.js`.
- `InfinityRoom/index.html` — 3D mirrored-room preview of the exhibition space.

## Where students write their code

Work inside **`Poster/Template/`** — edit `sketch.js` (and `index.html` if you
add assets). Keep the folder self-contained. To run several posters side by
side, copy the folder (e.g. `Poster/Template` → `Poster/MyPoster`) and point
`index.html`'s iframe `src` at the copy. A poster uses the library variables:

```javascript
poster.position.x/.y  // tracked position (mouse fallback)
poster.posNormal.x/.y // same, normalised 0..1
poster.vw / poster.vh // 1% of viewport width / height
```
