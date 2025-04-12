/**
 * Imports a module dynamically with success and error handling
 * @param {string} modulePath - Path to the module to import
 * @param {Function} onSuccess - Function to call when import succeeds
 * @param {Function} onError - Function to call when import fails
 */
export function importModule(modulePath, onSuccess, onError) {
  import(modulePath).then(onSuccess).catch(onError);
}

/**
 * Creates an error handler for module loading errors
 * @param {string} modulePath - Path to the module that failed to load
 * @param {Function} errorFn - Error logging function
 * @returns {Function} Error handler function
 */
export function handleModuleError(modulePath, errorFn) {
  return (e) => {
    errorFn('Error loading module ' + modulePath + ':', e);
  };
}

/**
 * Creates a module initializer function that will be called when a dynamic import completes
 * @param {HTMLElement} article - The article element containing the toy
 * @param {string} functionName - The name of the exported function to use from the module
 * @param {Function} querySelector - Function to find elements within the article
 * @param {object} globalState - The shared application state
 * @param {Function} stopDefault - Function to prevent default event action
 * @param {Function} createEnv - Function to create the environment map for the toy
 * @param {Function} error - Function for logging errors
 * @param {Function} addWarning - Function to add a warning style to the output
 * @param {Function} addEventListener - Function to add event listeners
 * @param {Function} fetch - Function for making HTTP requests
 * @param {Function} createElement - Function to create an element
 * @param {Function} setTextContent - Function to set the text content of an element
 * @returns {Function} A function that takes a module and initializes the interactive component
 */
export function initialiseModule(article, functionName, querySelector, globalState, stopDefault, createEnv, error, addWarning, addEventListener, fetch, createElement = () => {}, setTextContent = () => {}) {
  return (module) => {
    const processingFunction = module[functionName];
    if (typeof processingFunction === 'function') {
      initializeInteractiveComponent(article, processingFunction, querySelector, globalState, stopDefault, createEnv, error, addWarning, addEventListener, fetch, createElement, setTextContent);
    } else {
      error(`Module does not export function ${functionName}`);
    }
  };
}

/**
 * Enable controls and update status message for an interactive component
 * @param {HTMLInputElement} inputElement
 * @param {HTMLButtonElement} submitButton
 * @param {HTMLElement} outputElement
 */
export function enableInteractiveControls(inputElement, submitButton, outputElement) {
  inputElement.disabled = false;
  submitButton.disabled = false;
  outputElement.textContent = 'Ready for input';
  outputElement.parentElement.classList.remove('warning');
}

/**
 * Creates a submit handler function for an interactive toy.
 * @param {HTMLInputElement} inputElement - The input field.
 * @param {HTMLElement} outputElement - The element to display output/errors.
 * @param {HTMLElement} outputParent - The parent element of the output element.
 * @param {object} globalState - The shared application state.
 * @param {Function} processingFunction - The toy's core logic function.
 * @param {Function} stopDefault - Function to prevent default event action.
 * @param {Function} createEnv - Function to create the environment map for the toy.
 * @param {Function} errorFn - Function for logging errors.
 * @param {Function} addWarningFn - Function to add a warning style to the output.
 * @param {Function} fetchFn - Function to fetch data from a URL.
 * @param {Function} createElement - Function to create an element.
 * @param {Function} setTextContent - Function to set the text content of an element.
 * @returns {Function} An event handler function.
 */
export const createHandleSubmit = (inputElement, outputElement, outputParent, globalState, processingFunction, stopDefault, createEnv, errorFn, addWarningFn, fetchFn, createElement = () => {}, setTextContent = () => {}) => (event) => {
  if (event) {
    stopDefault(event);
  }
  const inputValue = inputElement.value;
  
  try {
    const env = createEnv(globalState);

    // Call the processing function with the input value
    const result = processingFunction(inputValue, env);

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = null;
    }

    if (parsed && typeof parsed === 'object' && parsed.request && typeof parsed.request.url === 'string') {
      fetchFn(parsed.request.url)
        .then(response => response.text())
        .then(body => {
          outputElement.textContent = body;
        })
        .catch(fetchError => {
          errorFn('Error fetching request URL:', fetchError);
          outputElement.textContent = 'Error fetching URL: ' + fetchError.message;
          addWarningFn(outputElement);
        });
    } else {
      // Default behavior
      outputElement.textContent = result;
    }
  } catch (e) {
    errorFn('Error processing input:', e);
    outputElement.textContent = 'Error: ' + e.message;
    addWarningFn(outputElement);
  }
};

/**
 * Initializes the interactive elements (input, button, output) within a toy's article element.
 * Sets up event listeners and initial state.
 * @param {HTMLElement} article - The article element containing the toy.
 * @param {Function} processingFunction - The toy's core logic function.
 * @param {Function} querySelectorFn - Function to find elements within the article.
 * @param {object} globalState - The shared application state.
 * @param {Function} stopDefaultFn - Function to prevent default event action.
 * @param {Function} createEnvFn - Function to create the environment map for the toy.
 * @param {Function} errorFn - Function for logging errors.
 * @param {Function} addWarningFn - Function to add a warning style to the output.
 * @param {Function} addEventListenerFn - Function to add event listeners.
 * @param {Function} fetchFn - Function for making HTTP requests.
 * @param {Function} createElement - Function to create an element.
 * @param {Function} setTextContent - Function to set the text content of an element.
 */
export function initializeInteractiveComponent(article, processingFunction, querySelectorFn, globalState, stopDefaultFn, createEnvFn, errorFn, addWarningFn, addEventListenerFn, fetchFn, createElement = () => {}, setTextContent = () => {}) {
  // Get the elements within the article
  const inputElement = querySelectorFn(article, 'input');
  const submitButton = querySelectorFn(article, 'button');
  const outputElement = querySelectorFn(article, 'p.output');
  const outputParent = querySelectorFn(article, 'div.output'); // Get the parent element
  
  // Disable controls during initialization
  inputElement.disabled = true;
  submitButton.disabled = true;
  
  // Update message to show JS is running
  outputElement.textContent = 'Initialising...';

  // Create the submit handler using the function from this module
  const handleSubmit = createHandleSubmit(inputElement, outputElement, outputParent, globalState, processingFunction, stopDefaultFn, createEnvFn, errorFn, addWarningFn, fetchFn, createElement, setTextContent);

  // Add event listener to the submit button
  addEventListenerFn(submitButton, 'click', handleSubmit);
  
  // Add event listener for Enter key in the input field
  addEventListenerFn(inputElement, 'keypress', (event) => {
    if (event.key === 'Enter') {
      handleSubmit(event); // Use the created handleSubmit
    }
  });

  // Enable controls when initialization is complete using the function from this module
  enableInteractiveControls(inputElement, submitButton, outputElement);
}

/**
 * Finds all interactive components registered on the window and sets up
 * IntersectionObservers (via the provided creator function) to lazy-load
 * and initialize them when they enter the viewport.
 * @param {Window} win - The window object.
 * @param {Document} doc - The document object.
 * @param {Function} logFn - Logging function.
 * @param {Function} warnFn - Warning function.
 * @param {Function} getElementByIdFn - Function to get element by ID.
 * @param {Function} createIntersectionObserverFn - Function that creates an IntersectionObserver for a given article, module path, and function name.
 */
export function initializeVisibleComponents(win, doc, logFn, warnFn, getElementByIdFn, createIntersectionObserverFn) {
  if (win.interactiveComponents && win.interactiveComponents.length > 0) {
    logFn('Initializing', win.interactiveComponents.length, 'interactive components via IntersectionObserver');
    win.interactiveComponents.forEach(component => {
      const article = getElementByIdFn(doc, component.id);
      if (article) {
        const observer = createIntersectionObserverFn(article, component.modulePath, component.functionName);
        observer.observe(article);
      } else {
        warnFn(`Could not find article element with ID: ${component.id} for component initialization.`);
      }
    });
  } else {
    warnFn('No interactive components found to initialize');
  }
}
