import { createParagraphElement } from '../presenters/paragraph.js';
/**
 * Calls the _dispose function on an element
 * @param {HTMLElement} element - The element with a _dispose function
 * @returns {void}
 */
const disposeListeners = (element) => {
  element._dispose();
};

import { createPreElement } from '../presenters/pre.js';
import { createTicTacToeBoardElement } from '../presenters/ticTacToeBoard.js';
import { createBattleshipFleetBoardElement } from '../presenters/battleshipSolitaireFleet.js';
import { createBattleshipCluesBoardElement } from '../presenters/battleshipSolitaireClues.js';

/**
 * Creates a basic number input element
 * @param {Object} dom - The DOM utilities object
 * @returns {HTMLInputElement} The created input element
 */
const createBaseNumberInput = (dom) => {
  const input = dom.createElement('input');
  dom.setType(input, 'number');
  return input;
};

/**
 * Removes a number input element if it exists in the container
 * @param {HTMLElement} containerElement - The container element to search in
 * @param {Object} dom - The DOM utilities object
 * @returns {void}
 */
const maybeRemoveNumber = (containerElement, dom) => {
  const numberInput = dom.querySelector(containerElement, 'input[type="number"]');
  if (numberInput) {
    disposeListeners(numberInput);
    dom.removeChild(containerElement, numberInput);
  }
};

/**
 * Removes a key-value input container if it exists
 * @param {HTMLElement} container - The container element to search in
 * @param {Object} dom - The DOM utilities object
 * @returns {void}
 */
const maybeRemoveKV = (container, dom) => {
  const kvContainer = dom.querySelector(container, '.kv-container');
  if (kvContainer) {
    disposeListeners(kvContainer);
    dom.removeChild(container, kvContainer);
  }
};

/**
 * Creates a handler for input dropdown changes
 * @param {Function} onChange - The change handler function
 * @param {Object} dom - The DOM utilities object
 * @returns {Function} The event handler function for input dropdown changes
 */
export const createAddDropdownListener = (onChange, dom) => dropdown => {
  dom.addEventListener(dropdown, 'change', onChange);
};

export const createInputDropdownHandler = (dom) => {
  return (event) => {
    const select = dom.getCurrentTarget(event);
    const container = dom.getParentElement(select);
    const textInput = dom.querySelector(container, 'input[type="text"]');
    const selectValue = dom.getValue(select);

    if (selectValue === 'text') {
      dom.reveal(textInput);
      dom.enable(textInput);
    } else {
      dom.hide(textInput);
      dom.disable(textInput);
    }

    if (selectValue === 'number') {
      maybeRemoveKV(container, dom);
      ensureNumberInput(container, textInput, dom);
    } else if (selectValue === 'kv') {
      maybeRemoveNumber(container, dom);
      ensureKeyValueInput(container, textInput, dom);
    } else {
      maybeRemoveNumber(container, dom);
      maybeRemoveKV(container, dom);
    }
  };
};

/**
 * Sets up the event listener and disposal for the input
 * @param {HTMLInputElement} input - The input element
 * @param {Function} onChange - The change handler
 * @returns {void}
 */
const setupInputEvents = (input, onChange) => {
  input.addEventListener('input', onChange);
  input._dispose = () => input.removeEventListener('input', onChange);
};

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



/**
 * Creates a handler function for output dropdown changes.
 * @param {Function} handleDropdownChange - The function to handle dropdown changes
 * @param {Function} getData - Function to retrieve data
 * @param {Object} dom - The DOM utilities object
 * @returns {Function} An event handler function for dropdown changes
 */
export const createOutputDropdownHandler = (handleDropdownChange, getData, dom) =>
  event => handleDropdownChange(event.currentTarget, getData, dom);

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

/**
 * Creates a number input element with the specified value and change handler
 * @param {string} value - The initial value for the input
 * @param {Function} onChange - The callback to execute when the input value changes
 * @param {Object} dom - The DOM utilities object
 * @returns {HTMLInputElement} The created number input element
 */
const createNumberInput = (value, onChange, dom) => {
  const input = createBaseNumberInput(dom);
  if (value) { dom.setValue(input, value); }
  setupInputEvents(input, onChange);
  return input;
};

/**
 * Positions the number input in the DOM relative to the text input
 * @param {HTMLElement} container - The container element
 * @param {HTMLInputElement} textInput - The text input element
 * @param {HTMLInputElement} numberInput - The number input element to position
 * @param {Object} dom - The DOM utilities object
 * @returns {void}
 */
const positionNumberInput = (container, textInput, numberInput, dom) => {
  const nextSibling = dom.getNextSibling(textInput);
  container.insertBefore(numberInput, nextSibling);
};

/**
 * Ensures a single <input type="number"> exists just after the text input
 * @param {HTMLElement} container - The container element
 * @param {HTMLInputElement} textInput - The text input element
 * @param {Object} dom - The DOM utilities object
 * @returns {HTMLInputElement} The number input element
 */
export const ensureNumberInput = (container, textInput, dom) => {
  let numberInput = dom.querySelector(container, 'input[type="number"]');

  if (!numberInput) {
    numberInput = createNumberInput(
      textInput.value, // textInput is assumed to be truthy
      createUpdateTextInputValue(textInput, dom),
      dom
    );
    positionNumberInput(container, textInput, numberInput, dom);
  }

  return numberInput;
};

/**
 * Creates an event handler that updates a text input's value from an event
 * @param {HTMLInputElement} textInput - The text input element to update
 * @param {Object} dom - The DOM utilities object
 * @returns {Function} An event handler function
 */
export const createUpdateTextInputValue = (textInput, dom) => (event) => {
  const targetValue = dom.getTargetValue(event);
  dom.setValue(textInput, targetValue);
};

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
 * Syncs the hidden text input field with the current state of the key-value rows.
 * Only includes non-empty key-value pairs in the output.
 * @param {HTMLInputElement} textInput - The hidden input element to update
 * @param {Object} rows - The key-value pairs to sync
 */
const syncHiddenField = (textInput, rows) => {
  if (!textInput) {return;}
  // Only include keys with non-empty key or value
  const filtered = {};
  for (const [k, v] of Object.entries(rows)) {
    if (k || v) {filtered[k] = v;}
  }
  textInput.value = JSON.stringify(filtered);
};

/**
 * Ensures a dynamic key/value editor exists just after the given hidden text input.
 * @param {HTMLElement} container - The container element to render the editor into
 * @param {HTMLInputElement} textInput - The hidden input element that stores the JSON string
 * @param {Object} dom - The DOM utilities object
 * @returns {HTMLElement} The container element for the key-value editor
 */
export const ensureKeyValueInput = (container, textInput, dom) => {
  let kvContainer = dom.querySelector(container, '.kv-container');
  if (!kvContainer) {
    kvContainer = dom.createElement('div');
    dom.setClassName(kvContainer, 'kv-container');
    const nextSibling = dom.getNextSibling(textInput);
    dom.insertBefore(container, kvContainer, nextSibling);
  }

  // ---------------------------------------------------------------------
  // State + bookkeeping
  // ---------------------------------------------------------------------
  let rows = {};
  let disposers = [];
  const clearDisposers = () => {
    disposers.forEach(fn => fn());
    disposers = [];
  };

  // ---------------------------------------------------------------------
  // Renderer
  // ---------------------------------------------------------------------
  const render = () => {
    clearDisposers();
    dom.removeAllChildren(kvContainer);

    // If no keys, add a single empty row
    if (Object.keys(rows).length === 0) {
      rows[''] = '';
    }

    const entries = Object.entries(rows);
    entries.forEach(([key, value], idx) => {
      const rowEl = dom.createElement('div');
      dom.setClassName(rowEl, 'kv-row');

      // Key field
      const keyEl = dom.createElement('input');
      dom.setType(keyEl, 'text');
      dom.setPlaceholder(keyEl, 'Key');
      keyEl.value = key;
      // store the current key so we can track renames without re‑rendering
      keyEl.dataset.prevKey = key;
      const onKey = e => {
        const prevKey = keyEl.dataset.prevKey;
        const newKey = e.target.value;

        // If nothing changed, just keep the hidden JSON fresh.
        if (newKey === prevKey) {
          syncHiddenField(textInput, rows);
          return;
        }

        // If the new key is non‑empty and unique, migrate the value.
        if (newKey !== '' && !(newKey in rows)) {
          rows[newKey] = rows[prevKey];
          delete rows[prevKey];
          keyEl.dataset.prevKey = newKey; // track latest key name
        }
        // Otherwise (empty or duplicate), leave the mapping under prevKey.

        syncHiddenField(textInput, rows);
      };

      keyEl.addEventListener('input', onKey);
      disposers.push(() => keyEl.removeEventListener('input', onKey));

      // Value field
      const valueEl = dom.createElement('input');
      valueEl.type = 'text';
      valueEl.placeholder = 'Value';
      valueEl.value = value;
      const onValue = e => {
        const rowKey = keyEl.dataset.prevKey; // may have changed via onKey
        rows[rowKey] = e.target.value;
        syncHiddenField(textInput, rows);
      };
      valueEl.addEventListener('input', onValue);
      disposers.push(() => valueEl.removeEventListener('input', onValue));

      // + / × button
      const btnEl = dom.createElement('button');
      btnEl.type = 'button';
      if (idx === entries.length - 1) {
        btnEl.textContent = '+';
        const onAdd = e => {
          e.preventDefault();
          // Add a new empty key only if there isn't already one
          if (!Object.prototype.hasOwnProperty.call(rows, '')) {
            rows[''] = '';
            render();
          }
        };
        btnEl.addEventListener('click', onAdd);
        disposers.push(() => btnEl.removeEventListener('click', onAdd));
      } else {
        btnEl.textContent = '×';
        const onRemove = e => {
          e.preventDefault();
          delete rows[key];
          render();
        };
        btnEl.addEventListener('click', onRemove);
        disposers.push(() => btnEl.removeEventListener('click', onRemove));
      }

      rowEl.appendChild(keyEl);
      rowEl.appendChild(valueEl);
      rowEl.appendChild(btnEl);
      kvContainer.appendChild(rowEl);
    });

    syncHiddenField(textInput, rows);
  };

  // ---------------------------------------------------------------------
  // Initialise from existing JSON in the hidden field, if present
  // ---------------------------------------------------------------------
  try {
    const existing = JSON.parse(textInput?.value || '{}');
    if (Array.isArray(existing)) {
      // Convert legacy array format [{key, value}] to object
      rows = {};
      for (const pair of existing) {
        if (pair.key !== undefined) {rows[pair.key] = pair.value ?? '';}
      }
    } else if (existing && typeof existing === 'object') {
      rows = { ...existing };
    }
  } catch { /* ignore parse errors */ }

  render();

  // Public API for cleanup by parent code
  kvContainer._dispose = () => {
    clearDisposers();
    dom.removeAllChildren(kvContainer);
    rows = [];
  };

  return kvContainer;
};

/**
 * New version: accepts a config object and delegates to the original.
 * @param {object} config - An object containing win, doc, logFn, warnFn, getElementByIdFn, and createIntersectionObserverFn.
 */









/**
 * Creates a function that initializes dropdown event listeners
 * @param {Document} document - The document object
 * @param {Function} onOutputChange - Handler for output dropdown changes
 * @param {Function} onInputChange - Handler for input dropdown changes
 * @returns {Function} A function that initializes dropdown event listeners
 */
export const createDropdownInitializer = (document, onOutputChange, onInputChange, dom) => {
  return () => {
    const outputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.output'));
    outputDropdowns.forEach(createAddDropdownListener(onOutputChange, dom));

    // Add event listeners to toy input dropdowns
    const inputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.input'));
    inputDropdowns.forEach(createAddDropdownListener(onInputChange, dom));
  };
};

/**
 * Helper function needed by getData
 */
export const getDeepStateCopy = (globalState) => JSON.parse(JSON.stringify(globalState));
