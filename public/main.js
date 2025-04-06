let globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {} // Holds data managed by toys like setTemporary
};

import { setupAudio } from './audio-controls.js';
import { initializeVisibleComponents, handleModuleError, initialiseModule } from './toys.js';
import { hideArticlesByClass } from './tags.js';
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
  getCurrentTime
} from './document.js';

function createEnv(globalState, fetch, log, error, warn) {
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
    import(modulePath).then(initialiseModule(article, functionName, querySelector, globalState, stopDefault, (globalState) => createEnv(globalState, fetch, log, error, warn), error, addWarning, addEventListener, fetch))
    .catch(handleModuleError(modulePath, error));
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

function toggleHideLink(link, className) {
  // Check if a span with the hide link already exists immediately after the link.
  if (link.nextElementSibling && link.nextElementSibling.classList.contains('hide-span')) {
    // Remove the span if it exists.
    link.nextElementSibling.remove();
  } else {
    // Create a new span element.
    var span = createElement(document, 'span');
    span.classList.add('hide-span');
    // Append the opening text node.
    appendChild(span, document.createTextNode(" ("));

    // Create the hide anchor element.
    var hideLink = createElement(document, 'a');
    hideLink.textContent = "hide";
    // Add click listener to trigger hideArticlesByClass.
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
    // Append the closing text node.
    appendChild(span, document.createTextNode(")"));

    // Insert the span immediately after the link.
    insertBefore(link.parentNode, span, link.nextSibling);
  }
}

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