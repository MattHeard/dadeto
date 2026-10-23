import { startTetracubePage } from '/core/browser/game/tetracube/page.js';

const dispose = startTetracubePage({
  documentObj: document,
  windowObj: window,
  requestFrame: window.requestAnimationFrame.bind(window),
  cancelFrame: window.cancelAnimationFrame.bind(window),
});

window.addEventListener('pagehide', dispose, { once: true });
