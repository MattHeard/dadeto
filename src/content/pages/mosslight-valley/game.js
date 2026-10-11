import { startMosslightPage } from '/core/browser/game/mosslight-valley/pagePresenter.js';

startMosslightPage({
  browser: { documentObj: document, windowObj: window, navigatorObj: navigator },
  animation: {
    requestFrame: window.requestAnimationFrame.bind(window),
    cancelFrame: window.cancelAnimationFrame.bind(window),
  },
});
