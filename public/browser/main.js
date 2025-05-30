import { setupAudio } from './audio-controls.js';
import { handleTagLinks } from './tags.js';
import {
  fetchAndCacheBlogData, getData, setData, getEncodeBase64
} from './data.js';
import {
  createOutputDropdownHandler,
  createInputDropdownHandler,
  createAddDropdownListener,
  handleDropdownChange,
  getComponentInitializer,
  makeCreateIntersectionObserver,
  initializeVisibleComponents,
  createDropdownInitializer
} from './toys.js';

import { dom } from './document.js';

import {
  getElementById,
  log,
  warn,
  getCurrentTime,
  getRandomNumber,
  hasNoInteractiveComponents,
  getInteractiveComponentCount,
  getInteractiveComponents,
} from './document.js';


const globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {} // Holds data managed by toys like setTemporary
};

/**
 * @module main
 * @description Main entry point for the application
 */

/**
 * @query
 * Creates and returns a new environment map for dependency injection
 * @returns {Map<string, Function>} Map of environment functions
 */
const loggers = { logInfo: log, logError: dom.logError, logWarning: warn };

function createEnv() {
  return new Map([
    ["getRandomNumber", getRandomNumber],
    ["getCurrentTime", getCurrentTime],
    ["getData", () => getData(globalState, fetch, loggers)],
    ["setData", (newData) => setData({ desired: newData, current: globalState }, loggers)],
    ["encodeBase64", getEncodeBase64(btoa, unescape, encodeURIComponent)]
  ]);
}

const env = { globalState, createEnv, error: dom.logError, fetch, loggers };

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
    getComponentInitializer
  },
  makeCreateIntersectionObserver(dom, env)
);

// --- Tag Filtering ---

handleTagLinks(dom);

// --- Initial Data Fetch ---
fetchAndCacheBlogData(globalState, fetch, { logInfo: log, logError: dom.logError });

setupAudio(dom);

// --- Dropdown Initialization ---

const getDataCallback = () => getData(globalState, fetch, loggers);

const onOutputDropdownChange = createOutputDropdownHandler(
  handleDropdownChange,
  getDataCallback,
  dom
);

const onInputDropdownChange = createInputDropdownHandler(dom);

const initializeDropdowns = createDropdownInitializer(onOutputDropdownChange, onInputDropdownChange, dom);

// Initialize dropdowns after DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  initializeDropdowns();

  // Get all dropdowns and add event listeners with the dom parameter
  const outputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.output'));
  outputDropdowns.forEach(createAddDropdownListener(onOutputDropdownChange, dom));

  const inputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.input'));
  inputDropdowns.forEach(createAddDropdownListener(onInputDropdownChange, dom));
});