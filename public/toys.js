/**
 * @command
 * Sets text content in a parent element by creating a paragraph element.
 * @param {HTMLElement} element - The target element. (DEPRECATED, will be removed)
 * @param {string} content - The text content to set.
 * @param {object} dom - DOM helper functions.
 * @param {HTMLElement} parent - The parent element to append to.
 */
import { createParagraphElement } from '../presenters/paragraph.js';
/**
 * Sets text content in a parent element using the new signature (no element argument).
 * @param {string} content - The text content to set.
 * @param {object} dom - DOM helper functions.
 * @param {HTMLElement} parent - The parent element to append to.
 * @returns {HTMLElement} The created paragraph element.
 */
function setTextContent(content, dom, parent) {
  dom.removeAllChildren(parent);
  const child = createParagraphElement(content, dom);
  dom.appendChild(parent, child);
  return child;
}

/**

 * @query
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
 * Creates a module initializer function to be called when a dynamic import completes.
 *
 * @param {HTMLElement} article - The article element containing the toy.
 * @param {string} functionName - The name of the exported function to use from the module.
 * @param {object} env - Environment object containing globalState, createEnv, error, and fetch.
 * @param {object} dom - Object containing DOM helper functions.
 * @returns {Function} A function that takes a module and initializes the interactive component.
 */
export function getModuleInitializer(article, functionName, config) {
  const getProcessing = makeProcessingFunction(functionName);
  const initialize = makeInteractiveInitializer(article, config);
  return (module) => runModuleInitializer(module, getProcessing, initialize);
}

function makeProcessingFunction(functionName) {
  return function(module) {
    return module[functionName];
  };
}

function makeInteractiveInitializer(article, config) {
  return function(processingFunction) {
    initializeInteractiveComponent(article, processingFunction, config);
  };
}

function runModuleInitializer(module, getProcessing, initialize) {
  const processingFunction = getProcessing(module);
  initialize(processingFunction);
}


function importModuleForIntersection(moduleInfo, moduleConfig) {
  const { dom } = moduleConfig;
  dom.importModule(
    moduleInfo.modulePath,
    getModuleInitializer(moduleInfo.article, moduleInfo.functionName, moduleConfig),
    handleModuleError(moduleInfo.modulePath, dom.error)
  );
}

/**
 * @command
 * Handles a single intersection event, triggering module import and observer disconnect if intersecting
 * @param {object} entry - The intersection entry
 * @param {object} observer - The observer instance
 * @param {string} modulePath - Path to module
 * @param {HTMLElement} article - The article element
 * @param {string} functionName - Exported function name
 * @param {object} config - Object containing env and dom
 */
function handleIntersection(entry, observer, moduleInfo, env) {
  const { dom } = env;
  if (dom.isIntersecting(entry)) {
    importModuleForIntersection(moduleInfo, env);
    dom.disconnectObserver(observer);
  }
}

/**
 * Calls handleIntersectionEntries with the same arguments (for migration/compatibility)
 */
function handleIntersectionEntriesNew(entries, observer, moduleInfo, moduleConfig) {
  entries.forEach(entry => handleIntersection(entry, observer, moduleInfo, moduleConfig));
}


/**
 * @query
 * Returns a callback for IntersectionObserver that handles intersection entries
 * @param {string} modulePath - Path to module
 * @param {HTMLElement} article - The article element
 * @param {string} functionName - Exported function name
 * @param {object} env - Environment
 * @param {object} dom - DOM helpers
 * @returns {Function} IntersectionObserver callback
 */
export function makeObserverCallback(modulePath, article, functionName, env, dom) {
  const moduleInfo = { article, modulePath, functionName };
  const moduleConfig = {
    globalState: env.globalState,
    createEnvFn: env.createEnv,
    errorFn: env.error,
    fetchFn: env.fetch,
    dom
  };
  return (entries, observer) =>
    handleIntersectionEntriesNew(entries, observer, moduleInfo, moduleConfig);
}

/**
 * @query
 * Returns a function that creates an IntersectionObserver for an article
 * @param {object} dom - DOM helpers
 * @param {object} env - Environment
 * @returns {Function} Function to create an IntersectionObserver
 */
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
/**
 * Enable controls and update status message for an interactive component
 * @param {HTMLInputElement} inputElement
 * @param {HTMLButtonElement} submitButton
 * @param {HTMLElement} outputElement
 * @param {object} dom - DOM helper object
 */
export function enableInteractiveControls(inputElement, submitButton, outputElement, dom, parent) {
  dom.enable(inputElement);
  dom.enable(submitButton);
  setTextContent('Ready for input', dom, parent);
  dom.removeWarning(parent);
}

function handleRequestResponse(url, outputElement, error, fetch, dom, parent) {
  fetch(url)
    .then(response => response.text())
    .then(body => {
      setTextContent(body, dom, parent);
    })
    .catch(fetchError => {
      error('Error fetching request URL:', fetchError);
      setTextContent('Error fetching URL: ' + fetchError.message, dom, parent);
      dom.addWarning(outputElement);
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

function handleParsedResult(parsed, outputElement, error, fetch, dom, parent = null) {
  if (!isValidParsedRequest(parsed)) {return false;}
  handleRequestResponse(parsed.request.url, outputElement, error, fetch, dom, parent);
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
function createHandleInputError(error, addWarning, setTextContent, parent) {
  return function(e) {
    error('Error processing input:', e);
    setTextContent('Error: ' + e.message);
    addWarning(parent);
  };
}

function processInputAndSetOutput(inputElement, outputElement, globalState, processingFunction, createEnv, errorFn, fetchFn, dom, parent) {
  const env = createEnv(globalState);
  const inputValue = inputElement.value;
  const result = processingFunction(inputValue, env);
  const parsed = parseJSONResult(result);
  if (!handleParsedResult(parsed, outputElement, errorFn, fetchFn, dom, parent)) {
    setTextContent(result, dom, parent);
  }
}

function handleInputProcessing(elements, processingFunction, env) {
  const { outputParentElement, inputElement, outputElement } = elements;
  const { globalState, createEnv, errorFn, fetchFn, dom } = env;
  const handleInputError = createHandleInputError(
    errorFn,
    dom.addWarning,
    (content) => setTextContent(content, dom, outputParentElement),
    outputParentElement
  );
  try {
    processInputAndSetOutput(
      inputElement,
      outputElement,
      globalState,
      processingFunction,
      createEnv,
      errorFn,
      fetchFn,
      dom,
      outputParentElement
    );
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
  const needsJavascriptWarning = dom.querySelector(article, 'div.output > p');
  const outputParent = dom.querySelector(article, 'div.output'); // Get the parent element

  // Disable input and submit during initialization
  disableInputAndButton(inputElement, submitButton);

  // Update message to show JS is running, replacing <p.output> with paragraph
  const initialisingWarning = setTextContent('Initialising...', dom, outputParent);

  // Create the submit handler using the function from this module
  const env = { globalState, createEnv: createEnvFn, errorFn, fetchFn, dom };
  const handleSubmit = createHandleSubmit({ inputElement, outputElement: initialisingWarning, outputParent, outputParentElement: outputParent }, processingFunction, env);

  // Add event listener to the submit button
  dom.addEventListener(submitButton, 'click', handleSubmit);

  // Add event listener for Enter key in the input field
  dom.addEventListener(inputElement, 'keypress', createHandleKeyPress(handleSubmit));

  // Enable controls when initialization is complete using the function from this module
  enableInteractiveControls(inputElement, submitButton, initialisingWarning, dom, outputParent);
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
