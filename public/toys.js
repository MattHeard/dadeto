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
 * @param {object} globalState - The shared application state
 * @param {Function} createEnv - Function to create the environment map for the toy
 * @param {Function} error - Function for logging errors
 * @param {Function} fetch - Function for making HTTP requests
 * @param {object} dom - Object containing DOM functions
 * @returns {Function} A function that takes a module and initializes the interactive component
 */
export function initialiseModule(article, functionName, globalState, createEnv, error, fetch, dom) {
  return (module) => {
    const processingFunction = module[functionName];
    initializeInteractiveComponent(
      article,
      processingFunction,
      globalState,
      createEnv,
      error,
      fetch,
      dom
    );
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

function handleRequestResponse(url, outputElement, errorFn, fetchFn, dom) {
  fetchFn(url)
    .then(response => response.text())
    .then(body => {
      dom.setTextContent(outputElement, body);
    })
    .catch(fetchError => {
      errorFn('Error fetching request URL:', fetchError);
      dom.setTextContent(outputElement, 'Error fetching URL: ' + fetchError.message);
      dom.addWarningFn(outputElement);
    });
}

function isObject(val) {
  return typeof val === 'object' && val !== null;
}

function hasRequestField(val) {
  return Object.prototype.hasOwnProperty.call(val, 'request');
}

function hasStringUrl(val) {
  return val.request && typeof val.request.url === 'string';
}

function isValidParsedRequest(parsed) {
  return (
    isObject(parsed) &&
    hasRequestField(parsed) &&
    hasStringUrl(parsed)
  );
}

function handleParsedResult(parsed, outputElement, errorFn, fetchFn, dom) {
  if (!isValidParsedRequest(parsed)) return false;
  handleRequestResponse(parsed.request.url, outputElement, errorFn, fetchFn, dom);
  return true;
}

/**
 * Parses the JSON result and returns the parsed object or null if parsing fails.
 * @param {string} result - The JSON string to parse.
 * @returns {object|null} The parsed object or null.
 */
function parseJSONResult(result) {
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
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
function createHandleInputError(outputElement, errorFn, dom) {
  return function(e) {
    errorFn('Error processing input:', e);
    dom.setTextContent(outputElement, 'Error: ' + e.message);
    dom.addWarningFn(outputElement);
  };
}

function processInputAndSetOutput(inputElement, outputElement, globalState, processingFunction, createEnv, errorFn, fetchFn, dom) {
  const env = createEnv(globalState);
  const inputValue = inputElement.value;
  const result = processingFunction(inputValue, env);
  const parsed = parseJSONResult(result);
  if (!handleParsedResult(parsed, outputElement, errorFn, fetchFn, dom)) {
    dom.setTextContent(outputElement, result);
  }
}

function handleInputProcessing(elements, processingFunction, env) {
  const { inputElement, outputElement } = elements;
  const { globalState, createEnv, errorFn, fetchFn, dom } = env;
  const handleInputError = createHandleInputError(outputElement, errorFn, dom);
  try {
    processInputAndSetOutput(inputElement, outputElement, globalState, processingFunction, createEnv, errorFn, fetchFn, dom);
  } catch (e) {
    handleInputError(e);
  }
}

export const createHandleSubmit = (elements, processingFunction, env) => (event) => {
  const { dom } = env;
  if (event) {
    dom.stopDefault(event);
  }
  handleInputProcessing(elements, processingFunction, env);
};

/**
 * Initializes the interactive elements (input, button, output) within a toy's article element.
 * Sets up event listeners and initial state.
 * @param {HTMLElement} article - The article element containing the toy.
 * @param {Function} processingFunction - The toy's core logic function.
 * @param {object} globalState - The shared application state.
 * @param {Function} createEnvFn - Function to create the environment map for the toy.
 * @param {Function} errorFn - Function for logging errors.
 * @param {Function} fetchFn - Function for making HTTP requests.
 * @param {object} dom - Object containing DOM functions.
 */
function disableInputAndButton(inputElement, submitButton) {
  inputElement.disabled = true;
  submitButton.disabled = true;
}

export function initializeInteractiveComponent(article, processingFunction, globalState, createEnvFn, errorFn, fetchFn, dom) {
  // Get the elements within the article
  const inputElement = dom.querySelector(article, 'input');
  const submitButton = dom.querySelector(article, 'button');
  const outputElement = dom.querySelector(article, 'p.output');
  const outputParent = dom.querySelector(article, 'div.output'); // Get the parent element
  
  // Disable input and submit during initialization
  disableInputAndButton(inputElement, submitButton);
  
  // Update message to show JS is running
  outputElement.textContent = 'Initialising...';

  // Create the submit handler using the function from this module
  const env = { globalState, createEnv: createEnvFn, errorFn, fetchFn, dom };
  const handleSubmit = createHandleSubmit({ inputElement, outputElement }, processingFunction, env);

  // Add event listener to the submit button
  dom.addEventListener(submitButton, 'click', handleSubmit);
  
  // Add event listener for Enter key in the input field
  dom.addEventListener(inputElement, 'keypress', createHandleKeyPress(handleSubmit));

  // Enable controls when initialization is complete using the function from this module
  enableInteractiveControls(inputElement, submitButton, outputElement);
}

/**
 * Returns a keypress event handler that triggers submit on Enter key.
 * @param {Function} handleSubmit - The submit handler function to call on Enter key.
 * @returns {Function} Keypress event handler.
 */
function createHandleKeyPress(handleSubmit) {
  return (event) => {
    if (event.key === 'Enter') {
      handleSubmit(event);
    }
  };
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
  if (!win.interactiveComponents || win.interactiveComponents.length === 0) {
    warnFn('No interactive components found to initialize');
    return;
  }
  logFn('Initializing', win.interactiveComponents.length, 'interactive components via IntersectionObserver');
  win.interactiveComponents.forEach(component => {
    const article = getElementByIdFn(doc, component.id);
    if (!article) {
      warnFn(`Could not find article element with ID: ${component.id} for component initialization.`);
      return;
    }
    const observer = createIntersectionObserverFn(article, component.modulePath, component.functionName);
    observer.observe(article);
  });
}

/**
 * Helper function needed by getData
 */
export const getDeepStateCopy = (globalState) => JSON.parse(JSON.stringify(globalState));
