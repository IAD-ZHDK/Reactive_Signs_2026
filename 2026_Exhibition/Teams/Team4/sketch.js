// Reactive Signs 2026 — write your poster here.
//
// Available from the poster library:
//   poster.position.x / .y   tracked position (mouse fallback), in pixels
//   poster.posNormal.x / .y  same, normalised 0..1
//   poster.vw / poster.vh    1% of viewport width / height

function setup() {
  createPosterCanvas();
}

function draw() {
  background(0, 50);

  // Follow the tracked x position across the canvas.
  const x = poster.position.x;

  // Diameter grows and shrinks with the tracked y position.
  const d = map(poster.posNormal.y, 0, 1, poster.vw * 4, poster.vw * 40);

  fill(255);
  noStroke();
  circle(x, height / 2, d);
}
