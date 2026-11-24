// Reactive Signs 2026 — example poster (tunnel) — based on Team 11, 2025.

let depth = 32;
let cols = 18;
let speed = 0.3;
let t = 0;

let glyphZ = 0;
let glyphSpeed = 0.2;

let tunnelFillLayer;
let tunnelStrokeLayer;
let maskLayer;
let finalLayer;

let lastMove = 0;
let idleDelay = 3000;
let idle = true;
let smoothedShift = 0; // horizontal, from position.x
let prevPosX = 0;

// --- y mapping (depth: toward / away from the screen) ---
// "zoom" = walking toward the screen zooms into the tunnel; "pan" = the
// vanishing point slides up/down (mirrors x). Change this one word to switch.
const Y_MODE = "zoom";
let prevPosY = 0;
let smoothedZoom = 1; // for Y_MODE "zoom"
let smoothedShiftY = 0; // for Y_MODE "pan"

function setup() {
  createCanvas(windowWidth, windowHeight); // fills the 1:3 poster frame
  noStroke();

  tunnelFillLayer = createGraphics(width, height);
  tunnelStrokeLayer = createGraphics(width, height);
  maskLayer = createGraphics(width, height);
  finalLayer = createGraphics(width, height);

  prevPosX = poster.position.x;
  prevPosY = poster.position.y;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  tunnelFillLayer = createGraphics(width, height);
  tunnelStrokeLayer = createGraphics(width, height);
  maskLayer = createGraphics(width, height);
  finalLayer = createGraphics(width, height);
}

function smoothstep(x) {
  return x * x * (3 - 2 * x);
}

function draw() {
  background(0);

  let now = millis();

  let currentPosX = poster.position.x;
  let currentPosY = poster.position.y;
  let movedX = abs(currentPosX - prevPosX);
  let movedY = abs(currentPosY - prevPosY);

  if (movedX > 5 || movedY > 5) {
    idle = false;
    lastMove = now;
  }

  if (now - lastMove > idleDelay) {
    idle = true;
  }

  prevPosX = currentPosX;
  prevPosY = currentPosY;
  glyphZ += glyphSpeed;

  if (glyphZ > depth) {
    glyphZ = 0;
  }

  let scroll = (t += speed) * 0.01;
  let targetShift = idle ? 0 : map(currentPosX, 0, width, -1, 1);
  let lerpAmt = idle ? 0.03 : 0.25;

  smoothedShift = lerp(smoothedShift, targetShift, lerpAmt);
  let cx = width / 2 - smoothedShift * (poster.vw * 40);

  // y mapping: depth (toward/away from the screen), 0..1 via posNormal.y
  let ny = poster.posNormal.y;
  let cy = height / 2;
  let zoom = 1;
  if (Y_MODE === "pan") {
    let targetShiftY = idle ? 0 : map(ny, 0, 1, -1, 1);
    smoothedShiftY = lerp(smoothedShiftY, targetShiftY, lerpAmt);
    cy = height / 2 - smoothedShiftY * (poster.vh * 40);
  } else {
    // "zoom": near the screen (ny→1) zooms in, far (ny→0) zooms out
    let targetZoom = idle ? 1 : map(ny, 0, 1, 1, 2.2);
    smoothedZoom = lerp(smoothedZoom, targetZoom, lerpAmt);
    zoom = smoothedZoom;
  }

  // Reset layers and paint settings
  tunnelFillLayer.clear();
  tunnelStrokeLayer.clear();
  maskLayer.clear();
  finalLayer.clear();

  tunnelStrokeLayer.noFill();
  tunnelStrokeLayer.stroke(255);
  tunnelStrokeLayer.strokeWeight(1.2);
  tunnelFillLayer.noStroke();

  // Tunnel
  for (let d = 0; d < depth; d++) {
    let td1 = smoothstep(d / depth);
    let td2 = smoothstep((d + 1) / depth);

    let L1 = lerp(0, cx, td1);
    let R1 = lerp(width, cx, td1);
    let T1 = lerp(0, cy, td1);
    let B1 = lerp(height, cy, td1);

    let L2 = lerp(0, cx, td2);
    let R2 = lerp(width, cx, td2);
    let T2 = lerp(0, cy, td2);
    let B2 = lerp(height, cy, td2);

    for (let j = 0; j < cols; j++) {
      let a = j / cols;
      let b = (j + 1) / cols;

      let x1A = lerp(L1, R1, a);
      let x1B = lerp(L1, R1, b);
      let x2A = lerp(L2, R2, a);
      let x2B = lerp(L2, R2, b);

      let checker = floor((d + scroll) * 0.5 + j) % 2;

      tunnelFillLayer.fill(checker < 1 ? 0 : 255);
      tunnelFillLayer.quad(x1A, T1, x1B, T1, x2B, T2, x2A, T2);
      tunnelFillLayer.quad(x1A, B1, x1B, B1, x2B, B2, x2A, B2);
      tunnelFillLayer.quad(
        L1,
        lerp(T1, B1, a),
        L1,
        lerp(T1, B1, b),
        L2,
        lerp(T2, B2, b),
        L2,
        lerp(T2, B2, a),
      );
      tunnelFillLayer.quad(
        R1,
        lerp(T1, B1, a),
        R1,
        lerp(T1, B1, b),
        R2,
        lerp(T2, B2, b),
        R2,
        lerp(T2, B2, a),
      );

      tunnelStrokeLayer.quad(x1A, T1, x1B, T1, x2B, T2, x2A, T2);
      tunnelStrokeLayer.quad(x1A, B1, x1B, B1, x2B, B2, x2A, B2);
      tunnelStrokeLayer.quad(
        L1,
        lerp(T1, B1, a),
        L1,
        lerp(T1, B1, b),
        L2,
        lerp(T2, B2, b),
        L2,
        lerp(T2, B2, a),
      );
      tunnelStrokeLayer.quad(
        R1,
        lerp(T1, B1, a),
        R1,
        lerp(T1, B1, b),
        R2,
        lerp(T2, B2, b),
        R2,
        lerp(T2, B2, a),
      );
    }
  }

  // A plain rectangle grows from the centre and reveals the tunnel through it.
  let rectScale = map(glyphZ, 0, depth, 0.05, 1.6);

  maskLayer.push();
  maskLayer.rectMode(CENTER);
  maskLayer.noStroke();
  maskLayer.fill(255);
  maskLayer.rect(cx, cy, width * rectScale, height * rectScale);
  maskLayer.pop();

  finalLayer.drawingContext.globalCompositeOperation = "source-over";
  finalLayer.image(tunnelFillLayer, 0, 0);

  finalLayer.drawingContext.globalCompositeOperation = "destination-in";
  finalLayer.image(maskLayer, 0, 0);

  finalLayer.drawingContext.globalCompositeOperation = "destination-over";
  finalLayer.image(tunnelStrokeLayer, 0, 0);

  if (Y_MODE === "zoom" && zoom !== 1) {
    push();
    translate(width / 2, height / 2);
    scale(zoom);
    image(finalLayer, -width / 2, -height / 2);
    pop();
  } else {
    image(finalLayer, 0, 0);
  }
}
