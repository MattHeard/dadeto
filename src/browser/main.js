let globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {} // Holds data managed by toys like setTemporary
};

import { setupAudio } from './audio-controls.js';
import { enableInteractiveControls, createHandleSubmit, initializeInteractiveComponent } from './toy-controls.js';
import { fetchAndCacheBlogData, getData, setData } from './data.js';

// Helper Functions (moved to top level for broader scope)
const getElementById = (doc, id) => doc.getElementById(id);
const getAudioElements = (doc) => querySelectorAll(doc, "audio"); // Use querySelectorAll helper
const querySelector = (el, selector) => el.querySelector(selector);
const querySelectorAll = (docOrEl, selector) => docOrEl.querySelectorAll(selector);
const removeControlsAttribute = (audio) => audio.removeAttribute("controls");
const createElement = (doc, tag) => doc.createElement(tag);
const createTextNode = (doc) => doc.createTextNode(" ");
const stopDefault = (e) => e.preventDefault();
const playAudio = (audio) => audio.play();
const pauseAudio = (audio) => audio.pause();
const addEventListener = (element, event, func) => element.addEventListener(event, func);
const appendChild = (parentNode, newChild) => parentNode.appendChild(newChild);
const insertBefore = (parentNode, newChild, refChild) => parentNode.insertBefore(newChild, refChild);
const log = (...args) => console.log(...args);
const warn = (...args) => console.warn(...args);
const error = (...args) => console.error(...args);
const addWarning = (outputElement) => {
  outputElement.parentElement.classList.add('warning');
};

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
      addEventListener
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

/**
 * Initialize a component when it enters the viewport
 * @param {Document} document - The document object
 * @param {string} id - The ID of the article element to observe
 * @param {string} modulePath - Path to the module containing the processing function
 * @param {string} functionName - Name of the function to import from the module
 */
function initializeWhenVisible(document, id, modulePath, functionName) {
  const article = getElementById(document, id);
  
  const observer = createIntersectionObserver(article, modulePath, functionName);
  
  // Start observing the article
  observer.observe(article);
}

// Initialize all registered components when they become visible
if (window.interactiveComponents && window.interactiveComponents.length > 0) {
  log('Initializing', window.interactiveComponents.length, 'interactive components');
  window.interactiveComponents.forEach(component => {
    initializeWhenVisible(document, component.id, component.modulePath, component.functionName);
  });
} else {
  warn('No interactive components found to initialize');
}

// Tag filtering functionality
function hideArticlesByClass(className) {
  var articles = document.getElementsByTagName('article');
  for (var i = 0; i < articles.length; i++) {
    if (articles[i].classList.contains(className)) {
      articles[i].style.display = 'none';
    }
  }
}

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
      hideArticlesByClass(className);
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