import { startNeonPage } from '/core/browser/game/neon-covenant/neonCovenant.js';

const handle = startNeonPage({
  documentObj: document,
  windowObj: window,
  navigatorObj: navigator,
  requestFrame: window.requestAnimationFrame.bind(window),
  cancelFrame: window.cancelAnimationFrame.bind(window),
});
window.addEventListener('pagehide', handle, { once: true });
