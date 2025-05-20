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

import { dom as baseDom } from './document.js';
import {
  getElementById,
  getAudioElements,
  setType,
  getElementsByTagName,
  pauseAudio,
  removeNextSibling,
  removeWarning,
  contains,
  hasClass,
  querySelector,
  removeControlsAttribute,
  createElement,
  createTextNode,
  stopDefault,
  playAudio,
  addEventListener,
  appendChild,
  insertBefore,
  log,
  warn,
  addWarning,
  disconnectObserver,
  isIntersecting,
  getCurrentTarget,
  getNextSibling,
  getParentElement,
  getValue,
  setValue,
  reveal,
  makeIntersectionObserver,
  getClasses,
  getCurrentTime,
  getTargetValue,
  hasNextSiblingClass,
  setClassName,
  setDataAttribute,
  setPlaceholder,
  getRandomNumber,
  addClass,
  removeAllChildren,
  setTextContent,
  removeChild,
  hide,
  enable,
  disable,
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

// createHandleClick has been moved to tags.js



/**
 * @query
 * Creates and returns a new environment map for dependency injection
 * @returns {Map<string, Function>} Map of environment functions
 */
const loggers = { logInfo: log, logError: baseDom.logError, logWarning: warn };

function createEnv() {
  return new Map([
    ["getRandomNumber", getRandomNumber],
    ["getCurrentTime", getCurrentTime],
    ["getData", () => getData(globalState, fetch, loggers)],
    ["setData", (newData) => setData({ desired: newData, current: globalState }, loggers)],
    ["encodeBase64", getEncodeBase64(btoa, unescape, encodeURIComponent)]
  ]);
}


const dom = {
  ...baseDom,
  makeIntersectionObserver,
  setType,
  setPlaceholder,
  setDataAttribute,
  addClass,
  appendChild,
  createTextNode,
  getElementsByTagName,
  getClasses,
  getRandomNumber,
  getCurrentTime,
  hasClass,
  hasNextSiblingClass,
  hide,
  insertBefore,
  log,
  pauseAudio,
  playAudio,
  removeControlsAttribute,
  removeNextSibling,
  enable,
  disable,
  removeChild,
  removeWarning,
  contains,
  removeAllChildren,
  getCurrentTarget,
  getNextSibling,
  getParentElement,
  setValue,
  getValue,
  getTargetValue,
  reveal
};
const env = { globalState, createEnv, error: baseDom.logError, fetch, loggers };

// Interactive components functionality

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

// Tag filtering functionality

handleTagLinks(dom);

// Initial fetch of blog data when the script loads
fetchAndCacheBlogData(globalState, fetch, { logInfo: log, logError: baseDom.logError });

setupAudio(dom);

// Add event listeners to toy output dropdowns

const getDataCallback = () => getData(globalState, fetch, loggers);

const onOutputDropdownChange = createOutputDropdownHandler(
  handleDropdownChange,
  getDataCallback,
  dom
);

const onInputDropdownChange = createInputDropdownHandler(dom);

const initializeDropdowns = createDropdownInitializer(document, onOutputDropdownChange, onInputDropdownChange, dom);

// Initialize dropdowns after DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  initializeDropdowns();

  // Get all dropdowns and add event listeners with the dom parameter
  const outputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.output'));
  outputDropdowns.forEach(createAddDropdownListener(onOutputDropdownChange, dom));

  const inputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.input'));
  inputDropdowns.forEach(createAddDropdownListener(onInputDropdownChange, dom));
});