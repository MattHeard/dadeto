let globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {} // Holds data managed by toys like setTemporary
};

import { setupAudio } from './audio-controls.js';
import { initializeInteractiveComponent, initializeVisibleComponents } from './toy-controls.js';
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
  hideArticlesByClass,
  toggleHideLink
} from './document.js';

const getRandomNumber = () => Math.random();
const getCurrentTime = () => new Date().toISOString();

function handleModuleError(modulePath) {
  return (e) => {
    error('Error loading module ' + modulePath + ':', e);
  };
}

function createEnv(globalState) {
  return new Map([
    ["getRandomNumber", getRandomNumber],
    ["getCurrentTime", getCurrentTime],
    ["getData", () => getData(globalState, fetch, log, error, warn)],
    ["setData", (newData) => setData(newData, globalState, log, error)]
  ]);
}

function initialiseModule(article, functionName) {
  return (module) => {
    const processingFunction = module[functionName];
    initializeInteractiveComponent(
      article,
      processingFunction,
      querySelector,
      globalState,
      stopDefault,
      createEnv,
      error,
      addWarning,
      addEventListener,
      fetch
    );
  };
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
    import(modulePath).then(initialiseModule(article, functionName))
    .catch(handleModuleError(modulePath));
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

const handleTagLinks = () => {
  Array.from(document.getElementsByTagName('a')).forEach(link => {
    Array.from(link.classList).forEach(className => {
      if (className.indexOf('tag-') === 0) {
        addEventListener(link, 'click', event => {
          stopDefault(event);
          toggleHideLink(link, className);
        });
        return; // exit after first tag- match
      }
    });
  });
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