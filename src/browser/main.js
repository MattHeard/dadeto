import { setupAudio } from './audio-controls.js';
import { handleTagLinks, hideArticlesByClass, hideArticlesWithoutClass } from './tags.js';
import { createBlogDataController, getEncodeBase64 } from './data.js';
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
  reveal,
} from './document.js';
import { revealBetaArticles } from './beta.js';
import { createMemoryStorageLens } from '../core/browser/memoryStorageLens.js';
import { createLocalStorageLens } from '../core/browser/localStorageLens.js';

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

const memoryLens = createMemoryStorageLens();
const permanentLens = createLocalStorageLens({
  storage: localStorage,
  logError: dom.logError,
});

const createBlogDependencies = () => ({
  fetch,
  loggers,
  storage: localStorage,
  memoryLens,
  permanentLens,
});

const {
  fetchAndCacheBlogData: fetchBlogData,
  getData: getBlogData,
  setLocalTemporaryData: applyLocalTemporaryData,
  setLocalPermanentData: applyLocalPermanentData,
  getLocalPermanentData: fetchLocalPermanentData,
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
    ['getLocalPermanentData', () => fetchLocalPermanentData()],
    ['encodeBase64', getEncodeBase64(btoa, encodeURIComponent)],
    ['memoryLens', memoryLens],
    ['permanentLens', permanentLens],
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

// --- Navbar Filter Buttons ---

/**
 * Reset all filters to show everything.
 */
function resetFilters() {
  const articles = Array.from(dom.getElementsByTagName('article'));
  for (const article of articles) {
    reveal(article);
  }
}

/**
 * Initialize filter button event handlers for the navbar.
 */
function initializeFilterButtons() {
  const buttons = document.querySelectorAll('.filter-button');

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const filterType = button.dataset.filter;

      // Update active button state
      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      // Apply filter
      switch (filterType) {
        case 'all':
          resetFilters();
          break;
        case 'blog':
          hideArticlesByClass('tag-toy', dom);
          break;
        case 'toys':
          hideArticlesWithoutClass('tag-toy', dom);
          break;
      }
    });
  });
}

initializeFilterButtons();

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
