// Single global state object
let globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {} // Holds data managed by toys like setTemporary
};

import { setupAudio } from './audio-controls.js';

// Interactive components functionality
/**
 * Initialize an interactive component with a processing function
 * @param {string} id - The ID of the article element
 * @param {Function} processingFunction - The function to process input values
 */
function initializeInteractiveComponent(id, processingFunction) {
  // Get the article element
  const article = document.getElementById(id);
  
  // Get the elements within the article
  const inputElement = article.querySelector('input');
  const submitButton = article.querySelector('button');
  const outputElement = article.querySelector('p.output');
  
  // Disable controls during initialization
  inputElement.disabled = true;
  submitButton.disabled = true;
  
  // Update message to show JS is running
  outputElement.textContent = 'Initialising...';
  
  /**
   * Enable controls and update status message
   */
  function enableControls() {
    inputElement.disabled = false;
    submitButton.disabled = false;
    outputElement.textContent = 'Ready for input';
    outputElement.parentElement.classList.remove('warning');
  }
  
  /**
   * Handle form submission events
   * @param {Event} event - The submission event
   */
  function handleSubmit(event) {
    if (event) {
      event.preventDefault();
    }
    const inputValue = inputElement.value;
    
    try {
      // Create an env Map with utility functions that might be needed by processing functions
      const env = new Map([
        ["getRandomNumber", () => Math.random()],
        ["getCurrentTime", () => new Date().toISOString()],
        ["getData", () => {
          // Return a deep copy of the current global state
          // Using JSON parse/stringify for a simple deep copy
          const stateCopy = JSON.parse(JSON.stringify(globalState));
          
          // Check blog status and trigger fetch if needed, but don't block
          if (stateCopy.blogStatus === 'idle') {
            fetchAndCacheBlogData(); // Trigger fetch (no await)
          } else if (stateCopy.blogStatus === 'error') {
            console.warn("Blog data previously failed to load:", stateCopy.blogError);
          }
          
          // Remove fetch-related properties from the copy returned to the toy
          delete stateCopy.blogStatus;
          delete stateCopy.blogError;
          delete stateCopy.blogFetchPromise;
          
          return stateCopy; 
        }],
        ["setData", (newData) => {
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
            
            console.log('Global state updated:', globalState);
          } else {
            console.error('setData received invalid data structure:', newData);
            throw new Error('setData requires an object with at least a \'temporary\' property.');
          }
        }]
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
      console.error('Error processing input:', error);
      outputElement.textContent = 'Error: ' + error.message;
      outputElement.parentElement.classList.add('warning');
    }
  }
  
  // Add event listener to the submit button
  submitButton.addEventListener('click', handleSubmit);
  
  // Add event listener for Enter key in the input field
  inputElement.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      handleSubmit(event);
    }
  });
  
  // Enable controls when initialization is complete
  enableControls();
}

/**
 * Initialize a component when it enters the viewport
 * @param {string} id - The ID of the article element to observe
 * @param {string} modulePath - Path to the module containing the processing function
 * @param {string} functionName - Name of the function to import from the module
 */
function initializeWhenVisible(id, modulePath, functionName) {
  const article = document.getElementById(id);
  
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
          console.error('Error loading module ' + modulePath + ':', error);
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
  console.log('Initializing', window.interactiveComponents.length, 'interactive components');
  window.interactiveComponents.forEach(component => {
    initializeWhenVisible(component.id, component.modulePath, component.functionName);
  });
} else {
  console.warn('No interactive components found to initialize');
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
    var span = document.createElement('span');
    span.classList.add('hide-span');
    // Append the opening text node.
    span.appendChild(document.createTextNode(" ("));

    // Create the hide anchor element.
    var hideLink = document.createElement('a');
    hideLink.textContent = "hide";
    // Add click listener to trigger hideArticlesByClass.
    hideLink.addEventListener('click', function(event) {
      event.preventDefault();
      hideArticlesByClass(className);
    });
    span.appendChild(hideLink);
    // Append the closing text node.
    span.appendChild(document.createTextNode(")"));

    // Insert the span immediately after the link.
    link.parentNode.insertBefore(span, link.nextSibling);
  }
}

const handleTagLinks = () => {
  Array.from(document.getElementsByTagName('a')).forEach(link => {
    Array.from(link.classList).forEach(className => {
      if (className.indexOf('tag-') === 0) {
        link.addEventListener('click', event => {
          event.preventDefault();
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
function fetchAndCacheBlogData() {
  // Prevent multiple simultaneous fetches
  if (globalState.blogStatus === 'loading' && globalState.blogFetchPromise) {
    console.log('Blog data fetch already in progress.');
    return globalState.blogFetchPromise; 
  }
  
  console.log('Starting to fetch blog data...');
  globalState.blogStatus = 'loading';
  globalState.blogError = null;
  
  globalState.blogFetchPromise = fetch('./blog.json') 
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      globalState.blog = data; // Update the blog property
      globalState.blogStatus = 'loaded';
      console.log('Blog data loaded successfully into globalState.');
      globalState.blogFetchPromise = null; // Clear promise on success
    })
    .catch(error => {
      console.error('Error loading blog data:', error);
      globalState.blogError = error;
      globalState.blogStatus = 'error';
      globalState.blogFetchPromise = null; // Clear promise on error
    });
  
  return globalState.blogFetchPromise;
}

// Initial fetch of blog data when the script loads
fetchAndCacheBlogData();

setupAudio(
  document,
  (doc) => doc.querySelectorAll("audio"),
  (audio) => audio.removeAttribute("controls"),
  (doc, tag) => doc.createElement(tag),
  (doc) => doc.createTextNode(" "),
  (e) => e.preventDefault(),
  (audio) => audio.play(),
  (audio) => audio.pause(),
  (element, event, func) => element.addEventListener(event, func),
  (parentNode, newChild) => parentNode.appendChild(newChild),
  (parentNode, newChild, refChild) => parentNode.insertBefore(newChild, refChild)
);