import { setupAudio } from './audio-controls.js';
import { handleTagLinks } from './tags.js';
import {
  fetchAndCacheBlogData, getData, setData, encodeBase64
} from './data.js';
import { makeCreateIntersectionObserver, initializeVisibleComponents, handleDropdownChange } from './toys.js';
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
  getCurrentTime,
  setTextContent,
  disconnectObserver,
  isIntersecting,
  hide,
  pauseAudio,
  makeIntersectionObserver,
  addClass,
  getClasses,
  hasNextSiblingClass,
  removeNextSibling,
  removeChild,
  removeAllChildren,
  removeWarning,
  contains,
  enable,
} from './document.js';

function hasNoInteractiveComponents(win) {
  return !win.interactiveComponents || win.interactiveComponents.length === 0;
}

function getInteractiveComponentCount(win) {
  if (win.interactiveComponents) {
    return win.interactiveComponents.length;
  } else {
    return 0;
  }
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
    ["setData", (newData) => setData({ desired: newData, current: globalState }, loggers)],
    ["encodeBase64", encodeBase64]
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

const onOutputDropdownChange = event => handleDropdownChange(
  event.currentTarget,
  () => getData(globalState, fetch, loggers),
  dom
);

const onInputDropdownChange = event => {
  const select = event.currentTarget;
  const container = select.parentElement;              // <div class="value">
  const textInput = container.querySelector('input[type="text"]');

  if (textInput) {
    const showText = select.value === 'text';
    textInput.hidden   = !showText;
    textInput.disabled = !showText;
  }

  // ── number‑input management ───────────────────────────────
  const numberInputSelector = 'input[type="number"]';
  let numberInput = container.querySelector(numberInputSelector);

  if (select.value === 'number') {
    // create one if it doesn't already exist
    if (!numberInput) {
      numberInput = dom.createElement('input');
      numberInput.type = 'number';

      // insert right after the text input so DOM order is stable
      if (textInput && textInput.nextSibling) {
        container.insertBefore(numberInput, textInput.nextSibling);
      } else {
        container.appendChild(numberInput);
      }
    }
  } else {
    // any non‑number selection removes the number input, if present
    if (numberInput) container.removeChild(numberInput);
  }

  // Log change for debugging
  loggers.logInfo(`input dropdown changed: ${select.value}`);
};

window.addEventListener('DOMContentLoaded', () => {
  const outputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.output'));
  outputDropdowns.forEach(dropdown => {
    dropdown.addEventListener('change', onOutputDropdownChange);
  });

  // Add event listeners to toy input dropdowns
  const inputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.input'));
  inputDropdowns.forEach(dropdown => {
    dropdown.addEventListener('change', onInputDropdownChange);
  });
});