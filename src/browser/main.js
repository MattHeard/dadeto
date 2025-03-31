// Single global state object
let globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {} // Holds data managed by toys like setTemporary
};

import { setupAudio } from './audio-controls.js';
import { enableInteractiveControls } from './toy-controls.js';

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

const getRandomNumber = () => Math.random();

const getDeepStateCopy = (state) => JSON.parse(JSON.stringify(state));

// Interactive components functionality

/**
 * Initialize an interactive component with a processing function
 * @param {string} id - The ID of the article element
 * @param {Function} processingFunction - The function to process input values
 */
function initializeInteractiveComponent(id, processingFunction) {
  // Get the article element
  const article = getElementById(document, id);
  
  // Get the elements within the article
  const inputElement = querySelector(article, 'input');
  const submitButton = querySelector(article, 'button');
  const outputElement = querySelector(article, 'p.output');
  
  // Disable controls during initialization
  inputElement.disabled = true;
  submitButton.disabled = true;
  
  // Update message to show JS is running
  outputElement.textContent = 'Initialising...';

  /**
   * Handle form submission events
   * @param {Event} event - The submission event
   */
  const createHandleSubmit = (inputElement, globalState) => (event) => {
    if (event) {
      stopDefault(event);
    }
    const inputValue = inputElement.value;
    
    try {
      // Create an env Map with utility functions that might be needed by processing functions
      const getCurrentTime = () => new Date().toISOString();
      const getData = () => {
        // Return a deep copy of the current global state
        const stateCopy = getDeepStateCopy(globalState);
        
        // Check blog status and trigger fetch if needed, but don't block
        if (stateCopy.blogStatus === 'idle') {
          fetchAndCacheBlogData(globalState); // Trigger fetch (no await)
        } else if (stateCopy.blogStatus === 'error') {
          warn("Blog data previously failed to load:", stateCopy.blogError);
        }
        
        // Remove fetch-related properties from the copy returned to the toy
        delete stateCopy.blogStatus;
        delete stateCopy.blogError;
        delete stateCopy.blogFetchPromise;
        
        return stateCopy;
      };
      const setData = (newData) => {
        // Replace the entire global state, but validate basic structure
        if (typeof newData === 'object' && newData !== null && newData.hasOwnProperty('temporary')) {
          // Preserve the internal blog loading state properties when updating
          const currentBlogStatus = globalState.blogStatus;
          const currentBlogError = globalState.blogError;
          const currentBlogFetchPromise = globalState.blogFetchPromise;
          const currentBlogData = globalState.blog; // Preserve actual blog data too
          
          globalState = newData;
          
          // Restore internal properties
          globalState.blogStatus = currentBlogStatus;
          globalState.blogError = currentBlogError;
          globalState.blogFetchPromise = currentBlogFetchPromise;
          // Ensure the blog data wasn't wiped out if it wasn't included in newData
          if (!newData.hasOwnProperty('blog')) {
            globalState.blog = currentBlogData;
          }
          
          log('Global state updated:', globalState);
        } else {
          error('setData received invalid data structure:', newData);
          throw new Error('setData requires an object with at least a \'temporary\' property.');
        }
      };
      const env = new Map([
        ["getRandomNumber", getRandomNumber],
        ["getCurrentTime", getCurrentTime],
        ["getData", getData],
        ["setData", setData]
      ]);
      
      // Call the processing function with the input value
      // If the function accepts two parameters (length === 2), it will receive the env Map
      // If it only accepts one parameter, the second argument (env) will be ignored by the function
      const result = processingFunction.length === 2
                 ? processingFunction(inputValue, env)
                 : processingFunction(inputValue);
      
      // Update the output
      outputElement.textContent = result;
    } catch (error) {
      error('Error processing input:', error);
      outputElement.textContent = 'Error: ' + error.message;
      outputElement.parentElement.classList.add('warning');
    }
  };
  const handleSubmit = createHandleSubmit(inputElement, globalState);

  // Add event listener to the submit button
  addEventListener(submitButton, 'click', handleSubmit);
  
  // Add event listener for Enter key in the input field
  addEventListener(inputElement, 'keypress', (event) => {
    if (event.key === 'Enter') {
      handleSubmit(event);
    }
  });

  // Enable controls when initialization is complete
  enableInteractiveControls(inputElement, submitButton, outputElement);
}

/**
 * Initialize a component when it enters the viewport
 * @param {string} id - The ID of the article element to observe
 * @param {string} modulePath - Path to the module containing the processing function
 * @param {string} functionName - Name of the function to import from the module
 */
function initializeWhenVisible(id, modulePath, functionName) {
  const article = getElementById(document, id);
  
  // Create an observer instance
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      // If the article is visible
      if (entry.isIntersecting) {
        // Dynamically import the module only when the article is visible
        import(modulePath).then((module) => {
          const processingFunction = module[functionName];
          
          // Initialize the component with the imported function
          initializeInteractiveComponent(id, processingFunction);
        }).catch(error => {
          error('Error loading module ' + modulePath + ':', error);
        });
        
        // Stop observing once initialized
        observer.disconnect();
      }
    });
  }, {
    // Options for the observer
    root: null, // viewport
    threshold: 0.1 // 10% visibility is enough to trigger
  });
  
  // Start observing the article
  observer.observe(article);
}

// Initialize all registered components when they become visible
if (window.interactiveComponents && window.interactiveComponents.length > 0) {
  log('Initializing', window.interactiveComponents.length, 'interactive components');
  window.interactiveComponents.forEach(component => {
    initializeWhenVisible(component.id, component.modulePath, component.functionName);
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

/**
 * Fetches blog data and updates the global state.
 * Ensures only one fetch happens at a time.
 */
function fetchAndCacheBlogData(state) {
  // Prevent multiple simultaneous fetches
  if (state.blogStatus === 'loading' && state.blogFetchPromise) {
    log('Blog data fetch already in progress.');
    return state.blogFetchPromise; 
  }
  
  log('Starting to fetch blog data...');
  state.blogStatus = 'loading';
  state.blogError = null;
  
  state.blogFetchPromise = fetch('./blog.json') 
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      state.blog = data; // Update the blog property
      state.blogStatus = 'loaded';
      log('Blog data loaded successfully:', data);
    })
    .catch(error => {
      state.blogStatus = 'error';
      state.blogError = error;
      error('Error fetching blog data:', error);
    })
    .finally(() => {
      state.blogFetchPromise = null; // Clear the promise tracking
    });
  
  return state.blogFetchPromise; // Return the promise for potential chaining
}

// Initial fetch of blog data when the script loads
fetchAndCacheBlogData(globalState);

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