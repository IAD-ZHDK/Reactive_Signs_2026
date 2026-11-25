const OSC = require('osc-js');

const DEFAULT_OPTIONS = {
  address: '/position',
  host: 'localhost',
  port: 8025,
  retryInterval: 2000,
  signalTimeout: 2000,
  resize: true,
  debug: true,
};

const osc = new OSC();
let opened = false;
let connectionOptions = DEFAULT_OPTIONS;
let reconnectInterval;
let fallbackInterval;
let listeningToMouse = false;
let pointer = null;
let canvasObserver;
let canvasAspectRatio;
let debugCanvas;
let debugContext;
let fullscreenCursorStyle;
let debugFrame;
let lastDebugFrame = 0;
let fps = 0;
const positionAddresses = new Set();

export const posNormal = { x: 0.5, y: 0.5, z: 0 };
export const position = { x: 0, y: 0, z: 0 };
export const blobs = [];
let lastBlobs = 0;
export let x = posNormal.x;
export let y = posNormal.y;
export let z = posNormal.z;
export let vw = 1;
export let vh = 1;
export let connected = false;
export let oscSignal = false;
export let lastOSC = 0;

function numberOrUndefined(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function updatePosition(nextX, nextY, nextZ) {
  if (nextX !== undefined) {
    posNormal.x = x = nextX;
  }
  if (nextY !== undefined) {
    posNormal.y = y = nextY;
  }
  if (nextZ !== undefined) {
    posNormal.z = z = nextZ;
  }

  const { logicalWidth, logicalHeight } = canvasSize();
  position.x = posNormal.x * logicalWidth;
  position.y = posNormal.y * logicalHeight;
  position.z = posNormal.z;
  lastOSC = performance.now();
  oscSignal = true;
}

function canvasSize() {
  const canvas = document.querySelector('canvas');
  const rect = canvas?.getBoundingClientRect();
  const logicalWidth = Number.isFinite(window.width) && window.width > 0
    ? window.width
    : canvas?.width || window.innerWidth;
  const logicalHeight = Number.isFinite(window.height) && window.height > 0
    ? window.height
    : canvas?.height || window.innerHeight;

  return {
    left: rect?.left || 0,
    top: rect?.top || 0,
    width: rect?.width || logicalWidth,
    height: rect?.height || logicalHeight,
    logicalWidth,
    logicalHeight,
  };
}

function updateViewportUnits() {
  const { logicalWidth, logicalHeight } = canvasSize();
  vw = logicalWidth * 0.01;
  vh = logicalHeight * 0.01;
}

function resizeCanvasToOriginalRatio() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  if (!canvasAspectRatio) {
    const { logicalWidth, logicalHeight } = canvasSize();
    canvasAspectRatio = logicalWidth / logicalHeight;
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let targetWidth = viewportWidth;
  let targetHeight = targetWidth / canvasAspectRatio;

  if (targetHeight > viewportHeight) {
    targetHeight = viewportHeight;
    targetWidth = targetHeight * canvasAspectRatio;
  }

  targetWidth = Math.max(1, Math.floor(targetWidth));
  targetHeight = Math.max(1, Math.floor(targetHeight));

  if (typeof window.resizeCanvas === 'function') {
    window.resizeCanvas(targetWidth, targetHeight, true);
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;
  } else {
    canvas.style.width = `${targetWidth}px`;
    canvas.style.height = `${targetHeight}px`;
  }

  updateViewportUnits();
  syncMouseFallback();
}

function watchForCanvas() {
  if (document.querySelector('canvas')) {
    updateViewportUnits();
    resizeCanvasToOriginalRatio();
    return;
  }

  canvasObserver = new MutationObserver(() => {
    if (!document.querySelector('canvas')) return;
    canvasObserver.disconnect();
    canvasObserver = undefined;
    updateViewportUnits();
    resizeCanvasToOriginalRatio();
  });
  canvasObserver.observe(document.body, { childList: true, subtree: true });
}

function createDebugOverlay() {
  if (debugCanvas || !connectionOptions.debug) return;

  debugCanvas = document.createElement('canvas');
  debugCanvas.setAttribute('aria-hidden', 'true');
  debugCanvas.style.cssText = [
    'position:fixed',
    'inset:0',
    'width:100vw',
    'height:100vh',
    'z-index:10000',
    'pointer-events:none',
  ].join(';');
  document.body.appendChild(debugCanvas);
  debugContext = debugCanvas.getContext('2d');
  debugFrame = requestAnimationFrame(drawDebugOverlay);
}

function hideFullscreenCursor() {
  fullscreenCursorStyle = document.createElement('style');
  fullscreenCursorStyle.textContent = [
    ':fullscreen, :fullscreen *',
    '.poster-control-fullscreen, .poster-control-fullscreen *',
  ].join(', ') + ' { cursor: none !important; }';
  document.head.appendChild(fullscreenCursorStyle);
}

function updateFullscreenState() {
  const canvas = document.querySelector('canvas');
  const height = canvas?.getBoundingClientRect().height;
  const screenHeight = window.screen?.height;
  const fillsScreenHeight = height > 0 && screenHeight > 0
    && Math.abs(height - screenHeight) <= 1;
  const fullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement || fillsScreenHeight);
  document.documentElement.classList.toggle('poster-control-fullscreen', fullscreen);
  return fullscreen;
}

function drawDebugOverlay(time) {
  if (!debugContext) return;

  const dpr = window.devicePixelRatio || 1;
  const targetWidth = Math.round(window.innerWidth * dpr);
  const targetHeight = Math.round(window.innerHeight * dpr);
  if (debugCanvas.width !== targetWidth || debugCanvas.height !== targetHeight) {
    debugCanvas.width = targetWidth;
    debugCanvas.height = targetHeight;
  }

  debugContext.setTransform(1, 0, 0, 1, 0, 0);
  debugContext.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

  if (!updateFullscreenState()) {
    debugContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { left, top, logicalWidth, logicalHeight, width, height } = canvasSize();
    const pointX = left + (position.x / logicalWidth) * width;
    const pointY = top + (position.y / logicalHeight) * height;
    const depthRadius = 8 + Math.max(0, Math.min(1, position.z)) * Math.min(width, height) * 0.08;

    debugContext.save();
    debugContext.beginPath();
    debugContext.rect(left, top, width, height);
    debugContext.clip();
    debugContext.strokeStyle = '#f00';
    debugContext.fillStyle = '#f00';
    debugContext.lineWidth = 2;
    debugContext.beginPath();
    debugContext.arc(pointX, pointY, depthRadius, 0, Math.PI * 2);
    debugContext.stroke();
    debugContext.beginPath();
    debugContext.arc(pointX, pointY, 4, 0, Math.PI * 2);
    debugContext.fill();
    debugContext.restore();

    if (lastDebugFrame) {
      const currentFps = 1000 / Math.max(1, time - lastDebugFrame);
      fps = fps ? fps * 0.9 + currentFps * 0.1 : currentFps;
    }
    debugContext.fillStyle = '#f00';
    debugContext.font = '12px monospace';
    debugContext.textAlign = 'left';
    debugContext.textBaseline = 'top';
    debugContext.fillText(`${Math.round(fps)} FPS`, 12, 12);
  }

  lastDebugFrame = time;
  debugFrame = requestAnimationFrame(drawDebugOverlay);
}

function readPosition(message) {
  const args = message.args || [];
  const nextX = numberOrUndefined(args[0]);
  const nextY = numberOrUndefined(args[1]);
  const nextZ = numberOrUndefined(args[2]);

  if (nextX !== undefined && nextY !== undefined) {
    updatePosition(nextX, nextY, nextZ);
  }
}

function readLegacyDepth(message) {
  const args = message.args || [];
  const nextX = numberOrUndefined(args[3]);
  const nextY = numberOrUndefined(args[4]);
  const nextZ = numberOrUndefined(args[5]);

  if (nextX !== undefined && nextY !== undefined) {
    updatePosition(nextX, nextY, nextZ);
  }
}

function readBlobs(message) {
  const args = message.args || [];
  if (args.length % 3 !== 0) {
    console.error('Invalid /blobs message: expected x, y, z triples.');
    return;
  }
  const points = [];
  for (let i = 0; i < args.length; i += 3) {
    const x = numberOrUndefined(args[i]);
    const y = numberOrUndefined(args[i + 1]);
    const z = numberOrUndefined(args[i + 2]);
    if (x === undefined || y === undefined || z === undefined) {
      console.error('Invalid /blobs message: coordinates must be numbers.');
      return;
    }
    points.push({ x, y, z });
  }
  blobs.splice(0, blobs.length, ...points);
  lastBlobs = performance.now();
}

function readAxis(axis, message) {
  const value = numberOrUndefined(message.args?.[0]);
  if (value === undefined) return;

  updatePosition(
    axis === 'x' ? value : undefined,
    axis === 'y' ? value : undefined,
    axis === 'z' ? value : undefined,
  );
}

function updateFromMouse(event) {
  pointer = {
    clientX: event.clientX,
    clientY: event.clientY,
  };
  syncMouseFallback();
}

function syncMouseFallback() {
  if (!pointer || hasOSCSignal(connectionOptions.signalTimeout)) return;

  const { left, top, width, height, logicalWidth, logicalHeight } = canvasSize();

  posNormal.x = Math.max(0, Math.min(1, (pointer.clientX - left) / width));
  posNormal.y = Math.max(0, Math.min(1, (pointer.clientY - top) / height));
  posNormal.z = 0;
  position.x = posNormal.x * logicalWidth;
  position.y = posNormal.y * logicalHeight;

  x = posNormal.x;
  y = posNormal.y;
  z = 0;
  position.z = 0;
}

function reconnect() {
  if (!opened || connected || osc.status() !== OSC.STATUS.IS_CLOSED) return;

  osc.open({
    host: connectionOptions.host,
    port: connectionOptions.port,
  });
}

osc.on('open', () => {
  connected = true;
  console.info(`OSC connected at ws://${connectionOptions.host}:${connectionOptions.port}`);
});

osc.on('close', () => {
  connected = false;
});

osc.on('error', (error) => {
  console.error('OSC connection failed.', error);
});

osc.on('/x', (message) => readAxis('x', message));
osc.on('/y', (message) => readAxis('y', message));
osc.on('/z', (message) => readAxis('z', message));
osc.on('/depth', readLegacyDepth);
osc.on('/blobs', readBlobs);

export function setUpOSC(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (opened) return;
  opened = true;
  connectionOptions = config;

  if (!positionAddresses.has(config.address)) {
    osc.on(config.address, readPosition);
    positionAddresses.add(config.address);
  }

  if (!listeningToMouse) {
    window.addEventListener('pointermove', updateFromMouse);
    window.addEventListener('resize', updateViewportUnits);
    document.addEventListener('fullscreenchange', updateViewportUnits);
    listeningToMouse = true;
  }

  if (config.resize) {
    window.addEventListener('resize', resizeCanvasToOriginalRatio);
    document.addEventListener('fullscreenchange', resizeCanvasToOriginalRatio);
    watchForCanvas();
  } else {
    updateViewportUnits();
  }

  hideFullscreenCursor();
  updateFullscreenState();
  createDebugOverlay();
  osc.open({ host: config.host, port: config.port });
  reconnectInterval = window.setInterval(reconnect, config.retryInterval);
  fallbackInterval = window.setInterval(() => {
    updateFullscreenState();
    syncMouseFallback();
    if (lastBlobs && performance.now() - lastBlobs > connectionOptions.signalTimeout) {
      blobs.length = 0;
      lastBlobs = 0;
    }
  }, 50);
}

export function resizeToOriginalRatio() {
  if (!connectionOptions.resize) return;
  resizeCanvasToOriginalRatio();
}

export function closeOSC() {
  if (!opened) return;
  osc.close();
  opened = false;
  connected = false;
  window.clearInterval(reconnectInterval);
  window.clearInterval(fallbackInterval);
  window.removeEventListener('pointermove', updateFromMouse);
  window.removeEventListener('resize', updateViewportUnits);
  document.removeEventListener('fullscreenchange', updateViewportUnits);
  window.removeEventListener('resize', resizeCanvasToOriginalRatio);
  document.removeEventListener('fullscreenchange', resizeCanvasToOriginalRatio);
  canvasObserver?.disconnect();
  canvasObserver = undefined;
  cancelAnimationFrame(debugFrame);
  debugCanvas?.remove();
  debugCanvas = undefined;
  debugContext = undefined;
  fullscreenCursorStyle?.remove();
  fullscreenCursorStyle = undefined;
  document.documentElement.classList.remove('poster-control-fullscreen');
  lastDebugFrame = 0;
  fps = 0;
  listeningToMouse = false;
  pointer = null;
  blobs.length = 0;
  lastBlobs = 0;
}

export function hasOSCSignal(maxAge = 2000) {
  if (lastOSC === 0) {
    oscSignal = false;
  } else {
    oscSignal = performance.now() - lastOSC <= maxAge;
  }
  return oscSignal;
}
