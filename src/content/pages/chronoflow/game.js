import { startChronoflowPage } from '/core/browser/game/chronoflow/pagePresenter.js';

const dispose = startChronoflowPage({
  documentObj: document,
  grid: document.querySelector('#chronoflow-grid'),
  status: document.querySelector('#chronoflow-status'),
  clockStatus: document.querySelector('#clock-status'),
  openButton: document.querySelector('#open-sluice'),
  routeButton: document.querySelector('#route-valve'),
  advanceButton: document.querySelector('#advance-water'),
  resetButton: document.querySelector('#reset-level'),
  fetchImpl: window.fetch.bind(window),
  monotonicNow: window.performance.now.bind(window.performance),
});

window.addEventListener('pagehide', dispose, { once: true });
