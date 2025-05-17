// DOM helper functions
export const getElementById = (id) => document.getElementById(id);
export const querySelector = (el, selector) => el.querySelector(selector);
export const querySelectorAll = (docOrEl, selector) => docOrEl.querySelectorAll(selector);
export const addClass = (element, className) => element.classList.add(className);
export const getAudioElements = () => querySelectorAll(document, "audio");
export const removeControlsAttribute = (audio) => audio.removeAttribute("controls");
export const createElement = (tag) => document.createElement(tag);
export const createTextNode = (value) => document.createTextNode(value);
export const getElementsByTagName = (tagName) => document.getElementsByTagName(tagName);
export const hasClass = (element, cls) => element.classList.contains(cls);
export const hide = (element) => element.style.display = 'none';
export const addEventListener = (element, event, func) => element.addEventListener(event, func);
export const appendChild = (parentNode, newChild) => parentNode.appendChild(newChild);
export const insertBefore = (parentNode, newChild, refChild) => parentNode.insertBefore(newChild, refChild);
export const removeChild = (parentNode, child) => parentNode.removeChild(child);

/**
 * Removes all children from the given DOM element.
 * @param {HTMLElement} element - The parent element to clear.
 */
const removeChildNode = (element) => element.removeChild(element.firstChild);

export const removeAllChildren = (element) => {
  while (element.firstChild) {
    removeChildNode(element);
  }
};

export const contains = (parent, child) => parent.contains(child);


// Event handlers
export const stopDefault = (e) => e.preventDefault();
export const playAudio = (audio) => audio.play();
export const pauseAudio = (audio) => audio.pause();

// Console logging wrappers
export const log = (...args) => console.log(...args);
export const warn = (...args) => console.warn(...args);
export const error = (...args) => console.error(...args);

// Utility functions
export const getClasses = (el) => Array.from(el.classList);
export const getRandomNumber = () => Math.random();
export const getCurrentTime = () => new Date().toISOString();
export const hasNextSiblingClass = (link, cls) => link.nextElementSibling && link.nextElementSibling.classList.contains(cls);

// DOM manipulation functions
export const addWarning = (parent) => parent.classList.add('warning');
export const removeWarning = (outputElement) => outputElement.classList.remove('warning');

// Reveals the given element by resetting its display style
export const reveal = (element) => element.style.display = '';

/**
 * Gets the current target of an event
 * @param {Event} event - The event object
 * @returns {EventTarget} The current target of the event
 */
export const getCurrentTarget = (event) => event.currentTarget;

/**
 * Gets the parent element of the given element
 * @param {Element} element - The element to get the parent of
 * @returns {Element|null} The parent element, or null if the element has no parent
 */
export const getParentElement = (element) => element.parentElement;

/**
 * Gets the value of a form element
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} element - The form element to get the value from
 * @returns {string|number|boolean|Array<string>|FileList|null} The value of the element, or null if the element has no value
 */
export const getValue = (element) => element?.value ?? null;

/**
 * Enables the given input element by setting its disabled property to false
 * @param {HTMLElement} input - The input element to enable
 */
export const enable = (input) => {
  input.disabled = false;
};

/**
 * Disables the given input element by setting its disabled property to true
 * @param {HTMLElement} input - The input element to disable
 */
export const disable = (input) => {
  input.disabled = true;
};

export const removeNextSibling = link => link.nextElementSibling && link.nextElementSibling.remove();

/**
 * Sets the type of an input element
 * @param {HTMLInputElement} element - The input element to set the type for
 * @param {string} type - The type to set (e.g., 'text', 'number', 'email')
 */
export const setType = (element, type) => {
  if (element) {
    element.type = type;
  }
};

export const setTextContent = (element, content) => {
  element.textContent = content;
};

/**
 * Wrapper for IntersectionObserver constructor
 * @param {Function} callback - IntersectionObserver callback
 * @param {Object} options - IntersectionObserver options
 * @returns {IntersectionObserver}
 */
export const makeIntersectionObserver = (callback) =>
  new IntersectionObserver(callback, { root: null, threshold: 0.1 });

export const isIntersecting = (entry) => entry.isIntersecting;

export const disconnectObserver = (observer) => {
  observer.disconnect();
};

/**
 * Checks if a window has no interactive components
 * @param {Window} win - The window object to check
 * @returns {boolean} True if there are no interactive components, false otherwise
 */
export const hasNoInteractiveComponents = (win) => {
  return !win.interactiveComponents || win.interactiveComponents.length === 0;
};

/**
 * Gets the count of interactive components in the window
 * @param {Window} win - The window object to check
 * @returns {number} The count of interactive components, or 0 if none exist
 */
export const getInteractiveComponentCount = (win) => {
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
export const getInteractiveComponents = (win) => {
  return win.interactiveComponents || [];
};

