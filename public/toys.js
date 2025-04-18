/**
 * Sets text content on an element.
 * @param {HTMLElement} element - The target element.
 * @param {string} content - The text content to set.
 * @param {object} dom - DOM helper functions.
 */
function setTextContent(element, content, dom) {
  dom.setTextContent(element, content);
}

/**
 * Creates an error handler for module loading errors
 * @param {string} modulePath - Path to the module that failed to load
 * @param {Function} errorFn - Error logging function
 * @returns {Function} Error handler function
 */
export function handleModuleError(modulePath, error) {
  return (e) => {
    error('Error loading module ' + modulePath + ':', e);
  };
}

/**
 * Creates a module initializer function that will be called when a dynamic import completes
 * @param {HTMLElement} article - The article element containing the toy
 * @param {string} functionName - The name of the exported function to use from the module
 * @param {object} env - Environment object containing globalState, createEnv, error, and fetch
 * @param {object} dom - Object containing DOM functions
 * @returns {Function} A function that takes a module and initializes the interactive component
 */
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
export function initialiseModule(article, functionName, env, dom) {
  return (module) => {
    const processingFunction = module[functionName];
    const config = {
      globalState: env.globalState,
      createEnvFn: env.createEnv,
      errorFn: env.error,
      fetchFn: env.fetch,
      dom
    };
    initializeInteractiveComponent(
      article,
      processingFunction,
      config
    );
  };
}

export function handleIntersection(entry, observer, modulePath, article, functionName, env, dom) {
  if (dom.isIntersecting(entry)) {
    dom.importModule(
      modulePath,
      initialiseModule(article, functionName, env, dom),
      handleModuleError(modulePath, dom.error)
    );
    dom.disconnectObserver(observer);
  }
}

export function handleIntersectionEntries(entries, observer, modulePath, article, functionName, env, dom) {
  entries.forEach(entry => handleIntersection(entry, observer, modulePath, article, functionName, env, dom));
}

export function makeObserverCallback(modulePath, article, functionName, env, dom) {
  return (entries, observer) =>
    handleIntersectionEntries(entries, observer, modulePath, article, functionName, env, dom);
}

export function makeCreateIntersectionObserver(dom, env) {
  return function createIntersectionObserver(article, modulePath, functionName) {
    const observerCallback = makeObserverCallback(modulePath, article, functionName, env, dom);
    return dom.makeIntersectionObserver(observerCallback);
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

function handleRequestResponse(url, outputElement, error, fetch, dom) {
  fetch(url)
    .then(response => response.text())
    .then(body => {
      setTextContent(outputElement, body, dom);
    })
    .catch(fetchError => {
      error('Error fetching request URL:', fetchError);
      setTextContent(outputElement, 'Error fetching URL: ' + fetchError.message, dom);
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

function handleParsedResult(parsed, outputElement, error, fetch, dom) {
  if (!isValidParsedRequest(parsed)) return false;
  handleRequestResponse(parsed.request.url, outputElement, error, fetch, dom);
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
 * @param {Function} error - Function for logging errors.
 * @param {Function} addWarningFn - Function to add a warning style to the output.
 * @param {Function} fetchFn - Function to fetch data from a URL.
 * @param {Function} createElement - Function to create an element.
 * @param {Function} setTextContent - Function to set the text content of an element.
 * @returns {Function} An event handler function.
 */
function createHandleInputError(outputElement, error, addWarning, setTextContent) {
  return function(e) {
    error('Error processing input:', e);
    setTextContent(outputElement, 'Error: ' + e.message);
    addWarning(outputElement);
  };
}

function processInputAndSetOutput(inputElement, outputElement, globalState, processingFunction, createEnv, errorFn, fetchFn, dom) {
  const env = createEnv(globalState);
  const inputValue = inputElement.value;
  const result = processingFunction(inputValue, env);
  const parsed = parseJSONResult(result);
  if (!handleParsedResult(parsed, outputElement, errorFn, fetchFn, dom)) {
    setTextContent(outputElement, result, dom);
  }
}

function handleInputProcessing(elements, processingFunction, env) {
  const { inputElement, outputElement } = elements;
  const { globalState, createEnv, errorFn, fetchFn, dom } = env;
  const handleInputError = createHandleInputError(outputElement, errorFn, dom.addWarningFn, (element, content) => setTextContent(element, content, dom));
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
 * @param {Function} error - Function for logging errors.
 * @param {Function} fetchFn - Function for making HTTP requests.
 * @param {object} dom - Object containing DOM functions.
 */
function disableInputAndButton(inputElement, submitButton) {
  inputElement.disabled = true;
  submitButton.disabled = true;
}

/**
 * Initializes the interactive elements (input, button, output) within a toy's article element.
 * Sets up event listeners and initial state.
 * @param {HTMLElement} article - The article element containing the toy.
 * @param {Function} processingFunction - The toy's core logic function.
 * @param {object} config - An object containing globalState, createEnvFn, errorFn, fetchFn, and dom.
 */
export function initializeInteractiveComponent(article, processingFunction, config) {
  const { globalState, createEnvFn, errorFn, fetchFn, dom } = config;
  // Get the elements within the article
  const inputElement = dom.querySelector(article, 'input');
  const submitButton = dom.querySelector(article, 'button');
  const outputElement = dom.querySelector(article, 'p.output');
  const outputParent = dom.querySelector(article, 'div.output'); // Get the parent element
  
  // Disable input and submit during initialization
  disableInputAndButton(inputElement, submitButton);
  
  // Update message to show JS is running, replacing <p.output> with paragraph
  setTextContent(outputElement, 'Initialising...', dom);

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
    const article = getElementByIdFn(component.id);
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
