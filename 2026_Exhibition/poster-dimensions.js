window.posterDimensions = Object.freeze({ width: 480, height: 1200 });

const posterRoot = document.documentElement;
posterRoot.style.setProperty("--poster-width", `${window.posterDimensions.width}px`);
posterRoot.style.setProperty("--poster-height", `${window.posterDimensions.height}px`);
posterRoot.style.setProperty(
  "--poster-aspect",
  window.posterDimensions.width / window.posterDimensions.height,
);
