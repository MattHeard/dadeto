import { startCommonsPage } from '/core/browser/game/the-commons-of-tomorrow/page.js';

const dispose = startCommonsPage({
  documentObj: document,
  windowObj: window,
  navigatorObj: navigator,
  requestFrame: window.requestAnimationFrame.bind(window),
  cancelFrame: window.cancelAnimationFrame.bind(window),
});

window.addEventListener('pagehide', dispose, { once: true });
