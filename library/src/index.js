import { setUpOSC } from './OSC_Control.js';

export {
  blobs,
  closeOSC,
  connected,
  hasOSCSignal,
  lastOSC,
  oscSignal,
  position,
  posNormal,
  resizeToOriginalRatio,
  setUpOSC,
  x,
  y,
  z,
  vw,
  vh,
} from './OSC_Control.js';

// Keep the public setup function small enough to call from a p5.js setup().
export function setup(options) {
  setUpOSC(options);
}

// Older poster sketches rely on initialization without calling poster.setup().
if (typeof p5 !== 'undefined' && typeof p5.registerAddon === 'function') {
  p5.registerAddon((_, __, lifecycles) => {
    lifecycles.postsetup = () => setUpOSC();
  });
} else if (typeof p5 !== 'undefined' && typeof p5.prototype.registerMethod === 'function') {
  p5.prototype.registerMethod('afterSetup', () => setUpOSC());
} else if (typeof p5 !== 'undefined') {
  console.warn('Automatic poster initialization is unavailable; call poster.setup() in setup().');
}
