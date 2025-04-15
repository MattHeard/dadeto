let globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {} // Holds data managed by toys like setTemporary
};

import { setupAudio } from './audio-controls.js';
import { initializeVisibleComponents, handleModuleError, initialiseModule } from './toys.js';
import { hideArticlesByClass, toggleHideLink, createHandleClick } from './tags.js';
import { fetchAndCacheBlogData, getData, setData } from './data.js';
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
  pauseAudio,
  addEventListener,
  appendChild,
  insertBefore,
  log,
  warn,
  error,
  addWarning,
  getRandomNumber,
  getCurrentTime,
  hasNextSiblingClass,
  removeNextSibling,
  setTextContent,
  addClass,
  hide,
  makeIntersectionObserver
} from './document.js';

/**
 * Imports a module dynamically with success and error handling
 * @param {string} modulePath - Path to the module to import
 * @param {Function} onSuccess - Function to call when import succeeds
 * @param {Function} onError - Function to call when import fails
 */
function importModule(modulePath, onSuccess, onError) {
  import(modulePath).then(onSuccess).catch(onError);
}

// createHandleClick has been moved to tags.js


import { makeHandleHideSpan, makeHandleHideClick } from './tags.js';



function createEnv() {
  return new Map([
    ["getRandomNumber", getRandomNumber],
    ["getCurrentTime", getCurrentTime],
    ["getData", () => getData(globalState, fetch, log, error, warn)],
    ["setData", (newData) => setData(newData, globalState, log, error)]
  ]);
}


const dom = { createElement, setTextContent, stopDefault, addWarning, addEventListener, querySelector, disconnectObserver, isIntersecting, importModule, error, makeIntersectionObserver };
const env = { globalState, createEnv, error, fetch };
import { makeCreateIntersectionObserver } from './toys.js';
const createIntersectionObserver = makeCreateIntersectionObserver(dom, env);

import { isIntersecting, disconnectObserver } from './document.js';
// isIntersecting and disconnectObserver moved to document.js


import { handleIntersection, handleIntersectionEntries, makeObserverCallback } from './toys.js';


// Interactive components functionality
initializeVisibleComponents(
  window, 
  document, 
  log, 
  warn, 
  getElementById, 
  createIntersectionObserver // Pass the function defined in main.js
);

// Tag filtering functionality

import { startsWith, makeHandleClassName } from './tags.js';

const handleTagLinks = () => {
  const handleLink = link => {
    const dom = {
      createElement,
      addClass,
      appendChild,
      createTextNode,
      setTextContent,
      addEventListener,
      stopDefault,
      hasClass,
      hide,
      getElementsByTagName,
      insertBefore,
      hasNextSiblingClass,
      removeNextSibling
    };
    const handleClassName = makeHandleClassName(dom, link);
    const getClasses = el => Array.from(el.classList);
    getClasses(link).forEach(handleClassName);
  };

  Array.from(document.getElementsByTagName('a')).forEach(handleLink);
};

handleTagLinks();

// Initial fetch of blog data when the script loads
fetchAndCacheBlogData(globalState, fetch, log, error);

setupAudio(
  document,
  getAudioElements,
  removeControlsAttribute,
  createElement,
  createTextNode,
  stopDefault,
  playAudio,
  pauseAudio,
  addEventListener,
  appendChild,
  insertBefore
);