import { setupAudio } from './audio-controls.js';
import {
  fetchAndCacheBlogData, getData, setData
} from './data.js';
import {
  getElementById,
  getAudioElements,
  getElementsByTagName,
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
  error,
  addWarning,
  getRandomNumber,
  getCurrentTime
} from './document.js';

function hasNoInteractiveComponents(win) {
  return !win.interactiveComponents || win.interactiveComponents.length === 0;
}

function getInteractiveComponentCount(win) {
  return win.interactiveComponents ? win.interactiveComponents.length : 0;
}

function getInteractiveComponents(win) {
  return win.interactiveComponents || [];
}

function getComponentInitializer(getElement, logWarning, createIntersectionObserver) {
  return component => {
    const article = getElement(component.id);
    if (!article) {
      logWarning(`Could not find article element with ID: ${component.id} for component initialization.`);
      return;
    }
    const observer = createIntersectionObserver(article, component.modulePath, component.functionName);
    observer.observe(article);
  };
}


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
const loggers = { logInfo: log, logError: error, logWarning: warn };

function createEnv() {
  return new Map([
    ["getRandomNumber", getRandomNumber],
    ["getCurrentTime", getCurrentTime],
    ["getData", () => getData(globalState, fetch, loggers)],
    ["setData", (newData) => setData({ desired: newData, current: globalState }, loggers)]
  ]);
}


const dom = {
  createElement,
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
  error,
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
const env = { globalState, createEnv, error, fetch, loggers };
const createIntersectionObserver = makeCreateIntersectionObserver(dom, env);


// isIntersecting and disconnectObserver moved to document.js

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
  createIntersectionObserver
);

// Tag filtering functionality

handleTagLinks(dom);

// Initial fetch of blog data when the script loads
fetchAndCacheBlogData(globalState, fetch, { logInfo: log, logError: error });

setupAudio(dom);

// Add event listeners to toy output dropdowns
import { handleDropdownChange } from './toys.js';

window.addEventListener('DOMContentLoaded', () => {
  // Select all <select> elements that are direct children of a .value div following a .key with 'out' text, within an .entry article
  const dropdowns = Array.from(document.querySelectorAll('article.entry .value > select'));
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('change', event => handleDropdownChange(
      event.currentTarget,
      loggers.logInfo,
      () => getData(globalState, fetch, loggers),
      dom
    ));
  });
});