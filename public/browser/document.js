import { createRemoveListener } from '../core/browser/browser-core.js';

/** @typedef {import('../core/browser/domHelpers.js').DOMHelpers} DOMHelpers */

// DOM helper functions
export const getElementById = id => document.getElementById(id);
export const querySelector = (el, selector) => el.querySelector(selector);
/**
 * Queries the document for all elements matching the given selector
 * @param {string} selector - The CSS selector to match elements against
 * @returns {NodeList} A NodeList of matching elements
 */
export const querySelectorAll = selector => document.querySelectorAll(selector);
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
export const createElement = tag => document.createElement(tag);
export const createTextNode = value => document.createTextNode(value);
export const getElementsByTagName = tagName =>
  document.getElementsByTagName(tagName);
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

export { createPrefixedLogger, createPrefixedLoggers } from './logging.js';

// Utility functions
export const getClasses = el => Array.from(el.classList);
export const getRandomNumber = () => Math.random();
export const getCurrentTime = () => new Date().toISOString();
/**
 * Generates a random UUID using the browser's crypto API.
 * `crypto.randomUUID` is supported in modern browsers.
 * @returns {string} The generated UUID
 */
export const getUuid = () => crypto.randomUUID();
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
  const params = new URLSearchParams(window.location.search);
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
  new IntersectionObserver(callback, { root: null, threshold: 0.1 });

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
  } else {
    return 0;
  }
};

/**
 * Gets the interactive components from the window
 * @param {Window} win - The window object to get components from
 * @returns {Array} An array of interactive components, or an empty array if none exist
 */
export const getInteractiveComponents = win => {
  return win.interactiveComponents || [];
};
