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
  hide
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


import { makeHandleHideClick } from './tags.js';

function makeCreateHideSpan(dom) {
  return function createHideSpan(link, className) {
    var span = dom.createElement('span');
    dom.addClass(span, 'hide-span');
    dom.appendChild(span, dom.createTextNode(" ("));

    var hideLink = dom.createElement('a');
    dom.setTextContent(hideLink, "hide");


    const handleHideClick = makeHandleHideClick(dom, className);
    dom.addEventListener(hideLink, 'click', handleHideClick);

    dom.appendChild(span, hideLink);
    dom.appendChild(span, dom.createTextNode(")"));
    dom.insertBefore(link.parentNode, span, link.nextSibling);
  };
}



function createEnv() {
  return new Map([
    ["getRandomNumber", getRandomNumber],
    ["getCurrentTime", getCurrentTime],
    ["getData", () => getData(globalState, fetch, log, error, warn)],
    ["setData", (newData) => setData(newData, globalState, log, error)]
  ]);
}

function createIntersectionObserver(article, modulePath, functionName) {
  return new IntersectionObserver((entries, observer) =>
    handleIntersectionEntries(entries, observer, modulePath, article, functionName), {
    root: null,
    threshold: 0.1
  });
}

function handleIntersection(entry, observer, modulePath, article, functionName) {
  if (entry.isIntersecting) {
    const dom = { createElement, setTextContent, stopDefault, addWarning, addEventListener, querySelector };
    importModule(
      modulePath,
      initialiseModule(article, functionName, globalState, createEnv, error, fetch, dom),
      handleModuleError(modulePath, error)
    );
    observer.disconnect();
  }
}

function handleIntersectionEntries(entries, observer, modulePath, article, functionName) {
  entries.forEach(entry => handleIntersection(entry, observer, modulePath, article, functionName));
}

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

const handleTagLinks = () => {
  const handleLink = link => {
    const handleClassName = className => {
      if (className.indexOf('tag-') === 0) {
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
          insertBefore
        };
        const createHideSpan = makeCreateHideSpan(dom);
        const handleClick = createHandleClick({ stopDefault, hasNextSiblingClass, removeNextSibling, createHideSpan }, link, className);
        addEventListener(link, 'click', handleClick);
        return; // exit after first tag- match
      }
    };

    Array.from(link.classList).forEach(handleClassName);
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