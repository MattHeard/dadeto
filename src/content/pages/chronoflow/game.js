import { startChronoflowPage } from '/core/browser/game/chronoflow/pagePresenter.js';

let saveStorage;
try {
  saveStorage = window.localStorage;
} catch {
  saveStorage = null;
}

const dispose = startChronoflowPage({
  documentObj: document,
  grid: document.querySelector('#chronoflow-grid'),
  displayCanvas: document.querySelector('#chronoflow-display'),
  status: document.querySelector('#chronoflow-status'),
  clockStatus: document.querySelector('#clock-status'),
  inspectStatus: document.querySelector('#cell-readout'),
  openButton: document.querySelector('#open-sluice'),
  routeButton: document.querySelector('#route-valve'),
  editButton: document.querySelector('#edit-channel'),
  startTimedButton: document.querySelector('#start-timed'),
  keypadButtons: Array.from(document.querySelectorAll('.mosslight-keypad-button')),
  resetButton: document.querySelector('#reset-level'),
  fetchImpl: window.fetch.bind(window),
  monotonicNow: window.performance.now.bind(window.performance),
  saveStorage,
});

window.addEventListener('pagehide', dispose, { once: true });
