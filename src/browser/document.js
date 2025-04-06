// DOM helper functions
export const getElementById = (doc, id) => doc.getElementById(id);
export const querySelector = (el, selector) => el.querySelector(selector);
export const querySelectorAll = (docOrEl, selector) => docOrEl.querySelectorAll(selector);
export const getAudioElements = (doc) => querySelectorAll(doc, "audio");
export const removeControlsAttribute = (audio) => audio.removeAttribute("controls");
export const createElement = (doc, tag) => doc.createElement(tag);
export const createTextNode = (doc) => doc.createTextNode(" ");
export const addEventListener = (element, event, func) => element.addEventListener(event, func);
export const appendChild = (parentNode, newChild) => parentNode.appendChild(newChild);
export const insertBefore = (parentNode, newChild, refChild) => parentNode.insertBefore(newChild, refChild);

// Event handlers
export const stopDefault = (e) => e.preventDefault();
export const playAudio = (audio) => audio.play();
export const pauseAudio = (audio) => audio.pause();

// Console logging wrappers
export const log = (...args) => console.log(...args);
export const warn = (...args) => console.warn(...args);
export const error = (...args) => console.error(...args);

// Utility functions
export const getRandomNumber = () => Math.random();

// DOM manipulation functions
export const addWarning = (outputElement) => {
  outputElement.parentElement.classList.add('warning');
};




