import { setupAudio } from './audio-controls.js';
import { handleTagLinks } from './tags.js';
import { createBlogDataController } from './data.js';
import { getEncodeBase64 } from './encoding.js';
import {
  createOutputDropdownHandler,
  createInputDropdownHandler,
  handleDropdownChange,
  getComponentInitializer,
  makeCreateIntersectionObserver,
  initializeVisibleComponents,
  createDropdownInitializer,
} from './toys.js';

import {
  dom,
  getElementById,
  log,
  warn,
  getCurrentTime,
  getRandomNumber,
  getUuid,
  hasNoInteractiveComponents,
  getInteractiveComponentCount,
  getInteractiveComponents,
} from './document.js';
import { revealBetaArticles } from './beta.js';

const globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {}, // Holds data managed by toys like setTemporary
};

/**
 * @module main
 * @description Main entry point for the application
 */

/**
 * Creates and returns a new environment map for dependency injection.
 * @returns {Map<string, Function>} Map of environment functions.
 */
const loggers = { logInfo: log, logError: dom.logError, logWarning: warn };

const createBlogDependencies = () => ({
  fetch,
  loggers,
  storage: localStorage,
});

const {
  fetchAndCacheBlogData: fetchBlogData,
  getData: getBlogData,
  setLocalTemporaryData: applyLocalTemporaryData,
  setLocalPermanentData: applyLocalPermanentData,
} = createBlogDataController(createBlogDependencies);

/**
 * Generates a fresh environment map.
 * @returns {Map<string, Function>} Dependency map.
 */
function createEnv() {
  return new Map([
    ['getRandomNumber', getRandomNumber],
    ['getCurrentTime', getCurrentTime],
    ['getUuid', getUuid],
    ['getData', () => getBlogData(globalState)],
    [
      'setLocalTemporaryData',
      newData =>
        applyLocalTemporaryData({ desired: newData, current: globalState }),
    ],
    ['setLocalPermanentData', newData => applyLocalPermanentData(newData)],
    ['encodeBase64', getEncodeBase64(btoa, encodeURIComponent)],
  ]);
}

const env = {
  globalState,
  createEnv,
  error: dom.logError,
  fetch,
  loggers,
  getUuid,
};

// --- Interactive Components ---

initializeVisibleComponents(
  {
    win: window,
    logInfo: log,
    logWarning: warn,
    getElement: getElementById,
    hasNoInteractiveComponents,
    getInteractiveComponents,
    getInteractiveComponentCount,
    getComponentInitializer,
  },
  makeCreateIntersectionObserver(dom, env)
);

// --- Tag Filtering ---

handleTagLinks(dom);

// --- Initial Data Fetch ---
fetchBlogData(globalState);

setupAudio(dom, dom.setTextContent);

// --- Dropdown Initialization ---

const getDataCallback = () => getBlogData(globalState);

const onOutputDropdownChange = createOutputDropdownHandler(
  handleDropdownChange,
  getDataCallback,
  dom
);

const onInputDropdownChange = createInputDropdownHandler(dom);

const initializeDropdowns = createDropdownInitializer(
  onOutputDropdownChange,
  onInputDropdownChange,
  dom
);

// Initialize dropdowns after DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  initializeDropdowns();

  revealBetaArticles(dom);
});
