import { startMosslightPage } from '/core/browser/game/mosslight-valley/pagePresenter.js';

startMosslightPage({
  documentObj: document,
  windowObj: window,
  navigatorObj: navigator,
  requestFrame: window.requestAnimationFrame.bind(window),
  cancelFrame: window.cancelAnimationFrame.bind(window),
});
