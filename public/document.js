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
export const hide = (element) => { element.style.display = 'none'; };
export const addEventListener = (element, event, func) => element.addEventListener(event, func);
export const appendChild = (parentNode, newChild) => parentNode.appendChild(newChild);
export const insertBefore = (parentNode, newChild, refChild) => parentNode.insertBefore(newChild, refChild);
export const removeChild = (parentNode, child) => parentNode.removeChild(child);

export function contains(parent, child) {
  return parent && typeof parent.contains === 'function' ? parent.contains(child) : false;
}

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
export const hasNextSiblingClass = (link, cls) =>
  link.nextElementSibling && link.nextElementSibling.classList.contains(cls);

// DOM manipulation functions
export const addWarning = (outputElement) => {
  outputElement.classList.add('warning');
};

export const removeWarning = (outputElement) => {
  outputElement.classList.remove('warning');
};

// Enables the given input element by setting its disabled property to false
export function enable(input) {
  input.disabled = false;
}

export const removeNextSibling = link =>
  link.nextElementSibling && link.nextElementSibling.remove();

export function setTextContent(element, content) {
  element.textContent = content;
}

/**
 * Wrapper for IntersectionObserver constructor
 * @param {Function} callback - IntersectionObserver callback
 * @param {Object} options - IntersectionObserver options
 * @returns {IntersectionObserver}
 */
export function makeIntersectionObserver(callback) {
  return new IntersectionObserver(callback, { root: null, threshold: 0.1 });
}

export function isIntersecting(entry) {
  return entry.isIntersecting;
}

export function disconnectObserver(observer) {
  observer.disconnect();
}

