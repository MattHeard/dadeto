import { startThreefoldPage } from '/core/browser/game/threefold/page.js';

startThreefoldPage({
  documentObj: document,
  windowObj: window,
  navigatorObj: navigator,
  requestFrame: requestAnimationFrame,
  cancelFrame: cancelAnimationFrame,
});
