window.posterDimensions = Object.freeze({ width: 480, height: 1200 });

const posterRoot = document.documentElement;
posterRoot.style.setProperty("--poster-width", `${window.posterDimensions.width}px`);
posterRoot.style.setProperty("--poster-height", `${window.posterDimensions.height}px`);
posterRoot.style.setProperty(
  "--poster-aspect",
  window.posterDimensions.width / window.posterDimensions.height,
);

// Canvas size that fits the poster (keeping its aspect ratio) inside the
// current window — full size when there is room, scaled down otherwise.
function posterCanvasSize() {
  const { width, height } = window.posterDimensions;
  const scale = Math.min(1, windowWidth / width, windowHeight / height);
  return [
    Math.max(1, Math.floor(width * scale)),
    Math.max(1, Math.floor(height * scale)),
  ];
}

// Create the poster canvas and wire up tracking + auto-resize in one call.
// Call this from setup(); then just write draw(). `opts` is passed to
// poster.setup() (e.g. createPosterCanvas({ debug: true })).
function createPosterCanvas(opts) {
  createCanvas(...posterCanvasSize());
  poster.setup(Object.assign({ resize: false }, opts));
  window.addEventListener("resize", () => resizeCanvas(...posterCanvasSize()));
}
