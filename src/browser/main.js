import { setupAudio } from './audio-controls.js';
import { handleTagLinks } from './tags.js';
import {
  fetchAndCacheBlogData, getData, setData, getEncodeBase64
} from './data.js';
import {
  ensureKeyValueInput,
  ensureNumberInput,
  createOutputDropdownHandler,
  createInputDropdownHandler,
  createAddDropdownListener,
  handleDropdownChange,
  getComponentInitializer,
  makeCreateIntersectionObserver,
  initializeVisibleComponents
} from './toys.js';

import {
  getElementById,
  getAudioElements,
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
  error as logError,
  addWarning,
  disconnectObserver,
  isIntersecting,
  makeIntersectionObserver,
  getClasses,
  getCurrentTime,
  hasNextSiblingClass,
  getRandomNumber,
  addClass,
  removeAllChildren,
  setTextContent,
  removeChild,
  hide,
  enable,
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
 * @command
 * Imports a module dynamically with success and error handling
 * @param {string} modulePath - Path to the module to import
 * @param {Function} onSuccess - Function to call when import succeeds
 * @param {Function} onError - Function to call when import fails
 */
function importModule(modulePath, onSuccess, onError) {
  import(modulePath).then(onSuccess).catch(onError);
}

// createHandleClick has been moved to tags.js



/**
 * @query
 * Creates and returns a new environment map for dependency injection
 * @returns {Map<string, Function>} Map of environment functions
 */
const loggers = { logInfo: log, logError: logError, logWarning: warn };

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
  createElement,
  removeControlsAttribute,
  getAudioElements,
  setTextContent,
  stopDefault,
  addWarning,
  addEventListener,
  querySelector,
  disconnectObserver,
  isIntersecting,
  importModule,
  error: logError,
  makeIntersectionObserver,
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
  removeChild,
  removeWarning,
  contains,
  removeAllChildren
};
const env = { globalState, createEnv, error: logError, fetch, loggers };

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
fetchAndCacheBlogData(globalState, fetch, { logInfo: log, logError });

setupAudio(dom);

// Add event listeners to toy output dropdowns

const getDataCallback = () => getData(globalState, fetch, loggers);

const onOutputDropdownChange = createOutputDropdownHandler(
  handleDropdownChange,
  getDataCallback,
  dom
);

const onInputDropdownChange = createInputDropdownHandler(dom);

window.addEventListener('DOMContentLoaded', () => {
  const outputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.output'));
  outputDropdowns.forEach(createAddDropdownListener(onOutputDropdownChange));

  // Add event listeners to toy input dropdowns
  const inputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.input'));
  inputDropdowns.forEach(createAddDropdownListener(onInputDropdownChange));
});