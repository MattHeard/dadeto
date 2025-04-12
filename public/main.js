let globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {} // Holds data managed by toys like setTemporary
};

import { setupAudio } from './audio-controls.js';
import { initializeVisibleComponents, handleModuleError, initialiseModule, importModule } from './toys.js';
import { hideArticlesByClass, toggleHideLink } from './tags.js';
import { fetchAndCacheBlogData, getData, setData } from './data.js';
import {
  getElementById,
  getAudioElements,
  querySelector,
  querySelectorAll,
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
  setTextContent
} from './document.js';

const createHandleClick = (link, className) => event => {
  stopDefault(event);
  toggleHideLink(
    link,
    className,
    hasNextSiblingClass,
    removeNextSibling,
    createHideSpan
  );
};

const createHideSpan = (link, className) => {
  var span = createElement(document, 'span');
  span.classList.add('hide-span');
  appendChild(span, document.createTextNode(" ("));

  var hideLink = createElement(document, 'a');
  hideLink.textContent = "hide";
  addEventListener(hideLink, 'click', function(event) {
    stopDefault(event);
    hideArticlesByClass(
      className,
      tagName => document.getElementsByTagName(tagName),
      (element, cls) => element.classList.contains(cls),
      element => element.style.display = 'none'
    );
  });

  appendChild(span, hideLink);
  appendChild(span, document.createTextNode(")"));
  insertBefore(link.parentNode, span, link.nextSibling);
};

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
    handleIntersectionEntries(entries, observer, modulePath, article, functionName, importModule), {
    root: null,
    threshold: 0.1
  });
}

function handleIntersection(entry, observer, modulePath, article, functionName, importModule) {
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
  entries.forEach(entry => handleIntersection(entry, observer, modulePath, article, functionName, importModule));
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
        const handleClick = createHandleClick(link, className);
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