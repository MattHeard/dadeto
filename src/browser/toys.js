import { createParagraphElement } from '../presenters/paragraph.js';
import { createPreElement } from '../presenters/pre.js';
import { createTicTacToeBoardElement } from '../presenters/ticTacToeBoard.js';
import { createBattleshipFleetBoardElement } from '../presenters/battleshipSolitaireFleet.js';
import { createBattleshipCluesBoardElement } from '../presenters/battleshipSolitaireClues.js';

/**
 * Creates a component initializer function for setting up intersection observers.
 * @param {Function} getElement - Function to get an element by ID
 * @param {Function} logWarning - Function to log warnings
 * @param {Function} createIntersectionObserver - Function to create an intersection observer
 * @returns {Function} A function that initializes a component with an intersection observer
 */
export function getComponentInitializer(getElement, logWarning, createIntersectionObserver) {
  return component => {
    const article = getElement(component.id);
    if (!article) {
      logWarning(`Could not find article element with ID: ${component.id} for component initialization.`);
      return;
    }
    const observer = createIntersectionObserver(article, component.modulePath, component.functionName);
    observer.observe(article);
  };
}

/**
 * Handles dropdown changes for toy output selection.
 * Logs the selected value and article ID.
 * @param {Event} event - The change event from the dropdown.
 * @param {Function} logInfo - Logging function to use for output. Must be provided.
 */
function getDropdownArticle(dropdown) {
  return dropdown.closest('article.entry')
}

function getDropdownPostId(dropdown) {
  const article = getDropdownArticle(dropdown);
  return article.id;
}

export function handleDropdownChange(dropdown, getData, dom) {
  const postId = getDropdownPostId(dropdown);
  const selectedValue = dropdown.value;
  const data = getData();
  const output = data.output?.[postId];

  const parent = dom.querySelector(dropdown.parentNode, 'div.output');
  setTextContent({ presenterKey: selectedValue, content: output || '' }, dom, parent);
}



// Map of presenter keys to presenter functions
const presentersMap = {
  text: createParagraphElement,
  pre: createPreElement,
  'tic-tac-toe': createTicTacToeBoardElement,
  'battleship-solitaire-fleet': createBattleshipFleetBoardElement,
  'battleship-solitaire-clues-presenter': createBattleshipCluesBoardElement,
};

function setTextContent(output, dom, parent) {
  dom.removeAllChildren(parent);
  const presenter = presentersMap[output.presenterKey];
  const child = presenter(output.content, dom);
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
/**
 * Creates an error handler for module loading errors.
 * @param {string} modulePath - Path to the module that failed to load.
 * @param {Function} logError - Error logging function.
 * @returns {Function} Error handler function.
 */
export function handleModuleError(modulePath, logError) {
  return (e) => {
    logError('Error loading module ' + modulePath + ':', e);
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
/**
 * Creates a module initializer function to be called when a dynamic import completes.
 * @param {HTMLElement} article - The article element containing the toy.
 * @param {string} functionName - The name of the exported function to use from the module.
 * @param {object} config - Environment and DOM helpers for initialization.
 * @returns {Function} Function that takes a module and initializes the interactive component.
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
  const { dom, loggers } = moduleConfig;
  const logError = loggers.logError;
  dom.importModule(
    moduleInfo.modulePath,
    getModuleInitializer(moduleInfo.article, moduleInfo.functionName, moduleConfig),
    handleModuleError(moduleInfo.modulePath, logError)
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
/**
 * Calls handleIntersectionEntries with the same arguments (for migration/compatibility)
 */
function handleIntersectingEntry(observer, moduleInfo, moduleConfig) {
  const { dom } = moduleConfig;
  importModuleForIntersection(moduleInfo, moduleConfig);
  dom.disconnectObserver(observer);
}

function getEntryHandler(moduleInfo, moduleConfig) {
  const { dom } = moduleConfig;
  return (observer) => (entry) => {
    if (dom.isIntersecting(entry)) {
      handleIntersectingEntry(observer, moduleInfo, moduleConfig);
    }
  };
}





/**
 * Creates a moduleConfig object from env and dom
 * @param {object} env - Environment
 * @param {object} dom - DOM helpers
 * @returns {object} moduleConfig
 */
export function makeModuleConfig(env, dom) {
  return {
    globalState: env.globalState,
    createEnvFn: env.createEnv,
    errorFn: env.error,
    fetchFn: env.fetch,
    loggers: env.loggers,
    dom
  };
}

export function makeObserverCallback(moduleInfo, env, dom) {
  const moduleConfig = makeModuleConfig(env, dom);
  const handleEntryFactory = getEntryHandler(moduleInfo, moduleConfig);
  return (entries, observer) => {
    const handleEntry = handleEntryFactory(observer);
    entries.forEach(handleEntry);
  };
}

/**
 * @query
 * Returns a function that creates an IntersectionObserver for an article
 * @param {object} dom - DOM helpers
 * @param {object} env - Environment
 * @returns {Function} Function to create an IntersectionObserver
 */
export function makeCreateIntersectionObserver(dom, env) {
  return (article, modulePath, functionName) => {
    const moduleInfo = { article, modulePath, functionName };
    const observerCallback = makeObserverCallback(moduleInfo, env, dom);
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
 * @param {object} dom - DOM helper object
 * @param {HTMLElement} parent
 * @param {string} presenterKey - The presenter key to use (e.g., 'text', 'pre').
 */
export function enableInteractiveControls(elements, dom, presenterKey) {
  const { inputElement, submitButton, parent } = elements;
  const readyMessage = 'Ready for input';
  dom.enable(inputElement);
  dom.enable(submitButton);
  setTextContent({ content: readyMessage, presenterKey }, dom, parent);
  dom.removeWarning(parent);
}

function getText(response) {
  return response.text();
}

function makeDisplayBody(dom, parent, presenterKey) {
  return body => {
    setTextContent({ content: body, presenterKey }, dom, parent);
  };
}

function getFetchErrorHandler(env, parent, presenterKey) {
  const { dom, errorFn } = env;
  return error => {
    errorFn('Error fetching request URL:', error);
    setTextContent({ content: 'Error fetching URL: ' + error.message, presenterKey }, dom, parent);
    dom.addWarning(parent);
  };
}

function handleRequestResponse(url, env, options) {
  const { parent, presenterKey } = options;
  const { fetchFn, dom } = env;
  const displayBody = makeDisplayBody(dom, parent, presenterKey);
  const handleFetchError = getFetchErrorHandler(env, parent, presenterKey);
  fetchFn(url)
    .then(getText)
    .then(displayBody)
    .catch(handleFetchError);
}


import { isObject } from './common.js';

function hasRequestField(val) {
  return Object.prototype.hasOwnProperty.call(val, 'request');
}

function hasStringUrl(val) {
  return val.request && typeof val.request.url === 'string';
}

const parsedRequestPredicates = [isObject, hasRequestField, hasStringUrl];

function isValidParsedRequest(parsed) {
  return parsedRequestPredicates.every(fn => fn(parsed));
}

function handleParsedResult(parsed, env, options) {
  const isValid = isValidParsedRequest(parsed);
  if (isValid) {
    handleRequestResponse(parsed.request.url, env, options);
  }
  return isValid;
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


import { setOutput } from './setOutput.js';

// New wrapper function
function createHandleInputError(env, parent) {
  const logError = env.errorFn;
  const dom = env.dom;
  const addWarning = dom.addWarning;
  return (e) => {
    logError('Error processing input:', e);
    setTextContent({ content: 'Error: ' + e.message, presenterKey: 'text' }, dom, parent);
    addWarning(parent);
  };
}

function processInputAndSetOutput(elements, processingFunction, env) {
  const { inputElement, outputParentElement: parent, outputSelect, article } = elements;
  const { createEnv, dom } = env;
  const toyEnv = createEnv();
  const inputValue = inputElement.value;
  const result = processingFunction(inputValue, toyEnv);
  // Assume article and article.id are always truthy, no need to log
  setOutput(JSON.stringify({ [article.id]: result }), toyEnv);
  const parsed = parseJSONResult(result);
  const presenterKey = outputSelect.value;
  if (!handleParsedResult(parsed, env, { parent, presenterKey })) {
    setTextContent({ content: result, presenterKey }, dom, parent);
  }
}

function handleInputProcessing(elements, processingFunction, env) {
  const { outputParentElement } = elements;
  const handleInputError = createHandleInputError(env, outputParentElement);
  try {
    processInputAndSetOutput(elements, processingFunction, env);
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
  const logInfo = config.loggers.logInfo;
  const { globalState, createEnvFn, errorFn, fetchFn, dom } = config;
  logInfo('Initializing interactive component for article', article.id);
  // Get the elements within the article
  const inputElement = dom.querySelector(article, 'input');
  const submitButton = dom.querySelector(article, 'button');
  const outputParent = dom.querySelector(article, 'div.output'); // Get the parent element
  const outputSelect = dom.querySelector(article, 'select.output');

  // Disable input and submit during initialization
  disableInputAndButton(inputElement, submitButton);

  const presenterKey = 'text';
  // Update message to show JS is running, replacing <p.output> with paragraph
  const initialisingWarning = setTextContent({ content: 'Initialising...', presenterKey }, dom, outputParent);

  // Use logInfo directly from config
  const env = {
    globalState,
    createEnv: createEnvFn,
    errorFn,
    fetchFn,
    dom,
    logInfo
  };
  const handleSubmit = createHandleSubmit({ inputElement, outputElement: initialisingWarning, outputParent, outputParentElement: outputParent, outputSelect, article }, processingFunction, env);

  // Add event listener to the submit button
  dom.addEventListener(submitButton, 'click', handleSubmit);

  // Add event listener for Enter key in the input field
  dom.addEventListener(inputElement, 'keypress', createHandleKeyPress(handleSubmit));

  // Enable controls when initialization is complete using the function from this module
  enableInteractiveControls({ inputElement, submitButton, parent: outputParent }, dom, presenterKey);
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
 * @param {object} env - An object containing win, logInfo, logWarning, and getElement.
 * @param {Function} createIntersectionObserver - Function that creates an IntersectionObserver for a given article, module path, and function name.
 */
export function initializeVisibleComponents(env, createIntersectionObserver) {
  const { win, logInfo, logWarning, getElement } = env;
  if (env.hasNoInteractiveComponents(win)) {
    logWarning('No interactive components found to initialize');
    return;
  }
  const interactiveComponents = env.getInteractiveComponents(win);
  const interactiveComponentCount = env.getInteractiveComponentCount(win);
  logInfo('Initializing', interactiveComponentCount, 'interactive components via IntersectionObserver');
  const init = env.getComponentInitializer(getElement, logWarning, createIntersectionObserver);
  interactiveComponents.forEach(init);
}

/**
 * New version: accepts a config object and delegates to the original.
 * @param {object} config - An object containing win, doc, logFn, warnFn, getElementByIdFn, and createIntersectionObserverFn.
 */










/**
 * Helper function needed by getData
 */
export const getDeepStateCopy = (globalState) => JSON.parse(JSON.stringify(globalState));
