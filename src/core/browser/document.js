import { createRemoveListener } from './browser-core.js';

/** @typedef {import('../core/browser/domHelpers.js').DOMHelpers} DOMHelpers */

/**
 * @typedef {object} DocumentEnvironment
 * @property {Document} documentObj Browser document implementation.
 * @property {Window} windowObj Browser window implementation.
 * @property {typeof globalThis} globalThisObj Global object used for timers and feature probes.
 * @property {Navigator} navigatorObj Browser navigator implementation.
 */

/** @type {DocumentEnvironment | null} */
let documentEnvironment = null;

/**
 * Install the browser globals used by the DOM facade.
 * @param {DocumentEnvironment} deps Browser globals.
 * @returns {DocumentEnvironment} Installed environment.
 */
function setDocumentEnvironment(deps) {
  documentEnvironment = deps;
  return deps;
}

/**
 * Read the installed browser globals.
 * @returns {DocumentEnvironment} Browser globals.
 */
function getDocumentEnvironment() {
  if (!documentEnvironment) {
    throw new Error(
      'createDocumentHandle must be called before using DOM helpers.'
    );
  }

  return documentEnvironment;
}

/**
 * Resolve the current document.
 * @returns {Document} Browser document.
 */
function getDocumentObj() {
  return getDocumentEnvironment().documentObj;
}

/**
 * Resolve the current window.
 * @returns {Window} Browser window.
 */
function getWindowObj() {
  return getDocumentEnvironment().windowObj;
}

/**
 * Resolve the current global object.
 * @returns {typeof globalThis} Browser global object.
 */
function getGlobalThisObj() {
  return getDocumentEnvironment().globalThisObj;
}

/**
 * Resolve the current navigator.
 * @returns {Navigator} Browser navigator.
 */
function getNavigatorObj() {
  return getDocumentEnvironment().navigatorObj;
}

// DOM helper functions
export const getElementById = id => getDocumentObj().getElementById(id);
export const querySelector = (el, selector) => el.querySelector(selector);
/**
 * Queries the document for all elements matching the given selector
 * @param {string} selector - The CSS selector to match elements against
 * @returns {NodeList} A NodeList of matching elements
 */
export const querySelectorAll = selector =>
  getDocumentObj().querySelectorAll(selector);
export const addClass = (element, className) =>
  element.classList.add(className);

export const removeClass = (element, className) => {
  element.classList.remove(className);
};

export const setClassName = (element, className) => {
  element.className = className;
};

/**
 * Gets all audio elements in the document
 * @returns {NodeList} A NodeList of audio elements
 */
export const getAudioElements = () => querySelectorAll('audio');
export const removeControlsAttribute = audio =>
  audio.removeAttribute('controls');
export const createElement = tag => getDocumentObj().createElement(tag);
export const createTextNode = value => getDocumentObj().createTextNode(value);
export const getElementsByTagName = tagName =>
  getDocumentObj().getElementsByTagName(tagName);
export const hasClass = (element, cls) => element.classList.contains(cls);
export const hide = element => (element.style.display = 'none');
export const addEventListener = (element, event, func) =>
  element.addEventListener(event, func);
export const appendChild = (parentNode, newChild) =>
  parentNode.appendChild(newChild);
export const insertBefore = (parentNode, newChild, refChild) =>
  parentNode.insertBefore(newChild, refChild);
export const removeChild = (parentNode, child) => parentNode.removeChild(child);

/**
 * Removes the first child from the given DOM element.
 * @param {HTMLElement} element - The parent element to clear.
 * @returns {void} Indicates completion.
 */
const removeChildNode = element => element.removeChild(element.firstChild);

export const removeAllChildren = element => {
  while (element.firstChild) {
    removeChildNode(element);
  }
};

export const contains = (parent, child) => parent.contains(child);

// Event handlers
export const stopDefault = e => e.preventDefault();
export const playAudio = audio => audio.play();
export const pauseAudio = audio => audio.pause();

// Console logging wrappers
export const log = (...args) => console.log(...args);
export const warn = (...args) => console.warn(...args);
export const logError = (...args) => console.error(...args);

/**
 * Request the next animation frame when the browser supports it.
 * @param {(time: number) => void} callback - Frame callback.
 * @returns {number} Animation frame identifier.
 */
export const requestAnimationFrame = callback => {
  const requestFrame = getGlobalThisObj().requestAnimationFrame;
  if (typeof requestFrame !== 'function') {
    throw new Error('globalThis.requestAnimationFrame is not a function');
  }

  return requestFrame(callback);
};

/**
 * Cancel a queued animation frame when the browser supports it.
 * @param {number} handle - Animation frame identifier.
 * @returns {void}
 */
export const cancelAnimationFrame = handle => {
  const cancelFrame = getGlobalThisObj().cancelAnimationFrame;
  if (typeof cancelFrame !== 'function') {
    throw new Error('globalThis.cancelAnimationFrame is not a function');
  }

  cancelFrame(handle);
};

/**
 * Schedule a repeating timer when the browser supports it.
 * @param {() => void} callback - Interval callback.
 * @param {number} delay - Delay between callbacks in milliseconds.
 * @returns {number} Interval identifier.
 */
export const setInterval = (callback, delay) => {
  const setIntervalFn = getGlobalThisObj().setInterval;
  if (typeof setIntervalFn !== 'function') {
    throw new Error('globalThis.setInterval is not a function');
  }

  return setIntervalFn(callback, delay);
};

/**
 * Clear a repeating timer when the browser supports it.
 * @param {number} handle - Interval identifier.
 * @returns {void}
 */
export const clearInterval = handle => {
  const clearIntervalFn = getGlobalThisObj().clearInterval;
  if (typeof clearIntervalFn !== 'function') {
    throw new Error('globalThis.clearInterval is not a function');
  }

  clearIntervalFn(handle);
};

/**
 * Schedule a one-shot timer when the browser supports it.
 * @param {() => void} callback - Timeout callback.
 * @param {number} delay - Delay before the callback runs in milliseconds.
 * @returns {number} Timeout identifier.
 */
export const setTimeout = (callback, delay) => {
  const setTimeoutFn = getGlobalThisObj().setTimeout;
  if (typeof setTimeoutFn !== 'function') {
    throw new Error('globalThis.setTimeout is not a function');
  }

  return setTimeoutFn(callback, delay);
};

/**
 * Clear a one-shot timer when the browser supports it.
 * @param {number} handle - Timeout identifier.
 * @returns {void}
 */
export const clearTimeout = handle => {
  const clearTimeoutFn = getGlobalThisObj().clearTimeout;
  if (typeof clearTimeoutFn !== 'function') {
    throw new Error('globalThis.clearTimeout is not a function');
  }

  clearTimeoutFn(handle);
};

/**
 * Read connected gamepads when the browser supports the API.
 * @returns {(Gamepad | null)[]} Connected gamepads list.
 */
export const getGamepads = () => {
  const getGamepadsFn = getNavigatorObj().getGamepads;
  if (typeof getGamepadsFn !== 'function') {
    throw new Error('navigator.getGamepads is not a function');
  }

  return getGamepadsFn.call(getNavigatorObj());
};

export { createPrefixedLogger, createPrefixedLoggers } from './browser-core.js';

// Utility functions
export const getClasses = el => Array.from(el.classList);
export const getRandomNumber = () => {
  const random = new Uint32Array(1);
  getGlobalThisObj().crypto.getRandomValues(random);
  return random[0] / 2 ** 32;
};
export const getCurrentTime = () => new Date().toISOString();
/**
 * Generates a random UUID using the browser's crypto API.
 * `crypto.randomUUID` is supported in modern browsers.
 * @returns {string} The generated UUID
 */
export const getUuid = () => getGlobalThisObj().crypto.randomUUID();
export const hasNextSiblingClass = (link, cls) =>
  link.nextElementSibling?.classList.contains(cls);

// DOM manipulation functions
export const addWarning = parent => parent.classList.add('warning');
export const removeWarning = outputElement =>
  outputElement.classList.remove('warning');

// Reveals the given element by resetting its display style
export const reveal = element => (element.style.display = '');

/**
 * Gets the current target of an event
 * @param {Event} event - The event object
 * @returns {EventTarget} The current target of the event
 */
export const getCurrentTarget = event => event.currentTarget;

/**
 * Gets the parent element of the given element
 * @param {Element} element - The element to get the parent of
 * @returns {Element|null} The parent element, or null if the element has no parent
 */
export const getParentElement = element => element.parentElement;

/**
 * Gets the value from an event target
 * @param {Event|{target: EventTarget}} event - The event object with a target property
 * @returns {string} The value of the target
 */
export const getTargetValue = event => event.target.value;

/**
 * Sets the value of an event target
 * @param {Event|{target: EventTarget}} event - The event object with a target property
 * @param {string} value - The value to set
 */
export const setTargetValue = (event, value) => {
  event.target.value = value;
};

/**
 * Gets the value of a form element
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} element - The form element to get the value from (assumed to be truthy)
 * @returns {string|number|boolean|Array<string>|FileList} The value of the element (assumed to be truthy)
 */
export const getValue = element => element.value;

/**
 * Sets the value of a form element
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} element - The form element to set the value on (assumed to be truthy)
 * @param {string|number|boolean|Array<string>|FileList} value - The value to set
 * @returns {void}
 */
export const setValue = (element, value) => {
  element.value = value;
};

/**
 * Enables the given input element by setting its disabled property to false
 * @param {HTMLElement} input - The input element to enable
 */
export const enable = input => {
  input.disabled = false;
};

/**
 * Disables the given input element by setting its disabled property to true
 * @param {HTMLElement} input - The input element to disable
 */
export const disable = input => {
  input.disabled = true;
};

/**
 * Gets the next sibling node of the given element
 * @param {Node} element - The element to get the next sibling of
 * @returns {Node|null} The next sibling node (which could be an element, text node, etc.), or null if there isn't one
 */
export const getNextSibling = element => element.nextSibling;

export const removeNextSibling = link => link.nextElementSibling?.remove();

/**
 * Removes an event listener from an element
 * @param {EventTarget} target - The target element to remove the listener from
 * @param {string} event - The event type to remove
 * @param {Function} handler - The event handler function to remove
 * @returns {void}
 */
export const removeEventListener = (target, event, handler) => {
  target.removeEventListener(event, handler);
};

/**
 * Determines if the current URL contains the `beta` query parameter
 * @returns {boolean} True when the page URL includes `?beta`
 */
export const hasBetaParam = () => {
  const params = new URLSearchParams(getWindowObj().location.search);
  return params.has('beta');
};

/**
 * Sets the type of an input element
 * @param {HTMLInputElement} element - The input element to set the type for
 * @param {string} type - The type to set (e.g., 'text', 'number', 'email')
 */
export const setType = (element, type) => {
  element.type = type;
};

/**
 * Sets the placeholder text of an input element
 * @param {HTMLInputElement|HTMLTextAreaElement} element - The input element to set the placeholder for
 * @param {string} placeholder - The placeholder text to set
 */
export const setPlaceholder = (element, placeholder) => {
  element.placeholder = placeholder;
};

/**
 * Sets a data attribute on an element
 * @param {HTMLElement} element - The element to set the data attribute on (must be truthy)
 * @param {string} name - The name of the data attribute (without the 'data-' prefix, must be truthy)
 * @param {string} value - The value to set
 */
export const setDataAttribute = (element, name, value) => {
  element.dataset[name] = value;
};

/**
 * Gets the value of a data attribute from an element
 * @param {HTMLElement} element - The element to get the data attribute from (must be truthy)
 * @param {string} name - The name of the data attribute (without the 'data-' prefix, must be truthy)
 * @returns {string|undefined} The value of the data attribute, or undefined if not found
 */
export const getDataAttribute = (element, name) => element.dataset[name];

export const setTextContent = (element, content) => {
  element.textContent = content;
};

/**
 * Wrapper for the `IntersectionObserver` constructor.
 * @param {Function} callback - IntersectionObserver callback.
 * @returns {IntersectionObserver} New observer instance.
 */
export const makeIntersectionObserver = callback =>
  new (getWindowObj().IntersectionObserver)(callback, {
    root: null,
    threshold: 0.1,
  });

export const disconnectObserver = observer => {
  observer.disconnect();
};

export const isIntersecting = entry => entry.isIntersecting;

/**
 * Dynamically imports a module
 * @param {string} modulePath - Path to the module to import
 * @param {Function} onSuccess - Function to call when import succeeds
 * @param {Function} onError - Function to call when import fails
 */
const importModule = (modulePath, onSuccess, onError) => {
  import(modulePath).then(onSuccess).catch(onError);
};

/**
 * Centralized DOM manipulation utilities
 */
export const dom = /** @type {DOMHelpers} */ ({
  importModule,
  makeIntersectionObserver,
  setType,
  setPlaceholder,
  setDataAttribute,
  getDataAttribute,
  addClass,
  removeClass,
  removeEventListener,
  createRemoveListener,
  appendChild,
  createTextNode,
  getElementsByTagName,
  querySelectorAll,
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
  createElement,
  removeControlsAttribute,
  setClassName,
  getAudioElements,
  setTextContent,
  stopDefault,
  addWarning,
  addEventListener,
  removeNextSibling,
  enable,
  disable,
  removeChild,
  removeWarning,
  querySelector,
  disconnectObserver,
  isIntersecting,
  logError,
  error: logError,
  contains,
  removeAllChildren,
  getCurrentTarget,
  getNextSibling,
  getParentElement,
  setValue,
  getValue,
  getTargetValue,
  setTargetValue,
  hasBetaParam,
  requestAnimationFrame,
  cancelAnimationFrame,
  setInterval,
  clearInterval,
  setTimeout,
  clearTimeout,
  getGamepads,
  get globalThis() {
    return getGlobalThisObj();
  },
  reveal,
});

/**
 * Checks if a window has no interactive components
 * @param {Window} win - The window object to check
 * @returns {boolean} True if there are no interactive components, false otherwise
 */
export const hasNoInteractiveComponents = win => {
  return !win.interactiveComponents || win.interactiveComponents.length === 0;
};

/**
 * Gets the count of interactive components in the window
 * @param {Window} win - The window object to check
 * @returns {number} The count of interactive components, or 0 if none exist
 */
export const getInteractiveComponentCount = win => {
  if (win.interactiveComponents) {
    return win.interactiveComponents.length;
  }
  return 0;
};

/**
 * Gets the interactive components from the window
 * @param {Window} win - The window object to get components from
 * @returns {Array} An array of interactive components, or an empty array if none exist
 */
export const getInteractiveComponents = win => {
  return win.interactiveComponents || [];
};

/**
 * Create the browser document facade handle.
 * @param {DocumentEnvironment} deps Browser globals.
 * @returns {DOMHelpers & Record<string, Function>} Browser document helpers.
 */
export function createDocumentHandle(deps) {
  setDocumentEnvironment(deps);
  return {
    getElementById,
    querySelector,
    querySelectorAll,
    addClass,
    removeClass,
    setClassName,
    getAudioElements,
    removeControlsAttribute,
    createElement,
    createTextNode,
    getElementsByTagName,
    hasClass,
    hide,
    addEventListener,
    appendChild,
    insertBefore,
    removeChild,
    removeAllChildren,
    contains,
    stopDefault,
    playAudio,
    pauseAudio,
    log,
    warn,
    logError,
    requestAnimationFrame,
    cancelAnimationFrame,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    getGamepads,
    getClasses,
    getRandomNumber,
    getCurrentTime,
    getUuid,
    hasNextSiblingClass,
    addWarning,
    removeWarning,
    reveal,
    getCurrentTarget,
    getParentElement,
    getTargetValue,
    setTargetValue,
    getValue,
    setValue,
    enable,
    disable,
    getNextSibling,
    removeNextSibling,
    removeEventListener,
    hasBetaParam,
    setType,
    setPlaceholder,
    setDataAttribute,
    getDataAttribute,
    setTextContent,
    makeIntersectionObserver,
    disconnectObserver,
    isIntersecting,
    dom,
    hasNoInteractiveComponents,
    getInteractiveComponentCount,
    getInteractiveComponents,
  };
}
