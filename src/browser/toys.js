import { createParagraphElement } from '../presenters/paragraph.js';
import { createPrefixedLoggers } from './document.js';

/**
 * Parses the existing rows from the text input
 * @param {Object} dom - The DOM utilities object
 * @param {HTMLInputElement} inputElement - The input element containing the JSON string
 * @returns {Object} The parsed rows object
 */
/**
 * Converts an array of {key, value} objects to a key-value object
 * @param {Array<{key: string, value: any}>} array - The array to convert
 * @returns {Object} An object with keys and values from the array
 */
function isKeyValuePair(pair) {
  if (!pair || typeof pair !== 'object') {
    return false;
  }
  return 'key' in pair;
}

export const convertArrayToKeyValueObject = array => {
  if (!Array.isArray(array)) {
    return {};
  }
  return Object.fromEntries(
    array.filter(isKeyValuePair).map(pair => [pair.key, pair.value ?? ''])
  );
};

export const parseExistingRows = (dom, inputElement) => {
  try {
    const existing = JSON.parse(dom.getValue(inputElement) || '{}');
    if (Array.isArray(existing)) {
      // Convert legacy array format [{key, value}] to object
      return convertArrayToKeyValueObject(existing);
    } else if (existing && typeof existing === 'object') {
      return { ...existing };
    }
    return {};
  } catch {
    return {}; // Return empty object on parse errors
  }
};

/**
 * Clears all disposer functions and empties the array
 * @param {Array<Function>} disposersArray - The array of disposer functions to clear
 */
/**
 * Clears all disposer functions and empties the array
 * @param {Array<Function>} disposersArray - The array of disposer functions to clear
 * @returns {void}
 */
export const clearDisposers = disposersArray => {
  disposersArray.forEach(fn => fn());
  disposersArray.length = 0; // Clear array in place for better performance
};

/**
 * Factory function for creating a dispose function
 * @param {Array<Function>} disposers - Array of disposer functions to clear
 * @param {Object} dom - The DOM utilities object
 * @param {HTMLElement} container - The container element to clear
 * @param {Array} rows - The rows array to clear
 * @returns {Function} A function that cleans up resources
 */
export const createDispose = config => {
  const { disposers, dom, container, rows } = config;
  return () => {
    clearDisposers(disposers);
    dom.removeAllChildren(container);
    rows.length = 0;
  };
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
const createBaseNumberInput = dom => {
  const input = dom.createElement('input');
  dom.setType(input, 'number');
  return input;
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

import { textHandler } from '../inputHandlers/text.js';
import { numberHandler } from '../inputHandlers/number.js';
import { kvHandler } from '../inputHandlers/kv.js';
import { defaultHandler } from '../inputHandlers/default.js';
import { dendriteStoryHandler } from '../inputHandlers/dendriteStory.js';

export { handleKVType } from '../inputHandlers/kv.js';

const inputHandlersMap = {
  text: textHandler,
  number: numberHandler,
  kv: kvHandler,
  'dendrite-story': dendriteStoryHandler,
  default: defaultHandler,
};

export const createInputDropdownHandler = dom => {
  return event => {
    const select = dom.getCurrentTarget(event);
    const container = dom.getParentElement(select);
    const textInput = dom.querySelector(container, 'input[type="text"]');
    const selectValue = dom.getValue(select);

    const handleInput =
      inputHandlersMap[selectValue] || inputHandlersMap.default;
    handleInput(dom, container, textInput);
  };
};

/**
 * Sets up the event listener and disposal for the input
 * @param {HTMLInputElement} input - The input element
 * @param {Function} onChange - The change handler
 * @param {Object} dom - The DOM utilities object
 * @returns {void}
 */
const setupInputEvents = (input, onChange, dom) => {
  dom.addEventListener(input, 'input', onChange);
  input._dispose = createRemoveValueListener(dom, input, onChange);
};

/**
 * Creates a component initializer function for setting up intersection observers.
 * @param {Function} getElement - Function to get an element by ID
 * @param {Function} logWarning - Function to log warnings
 * @param {Function} createIntersectionObserver - Function to create an intersection observer
 * @returns {Function} A function that initializes a component with an intersection observer
 */
export function getComponentInitializer(
  getElement,
  logWarning,
  createIntersectionObserver
) {
  return component => {
    const article = getElement(component.id);
    if (!article) {
      logWarning(
        `Could not find article element with ID: ${component.id} for component initialization.`
      );
      return;
    }
    const observer = createIntersectionObserver(
      article,
      component.modulePath,
      component.functionName
    );
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
  return dropdown.closest('article.entry');
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
  setTextContent(
    { presenterKey: selectedValue, content: output || '' },
    dom,
    parent
  );
}

/**
 * Creates a handler function for output dropdown changes.
 * @param {Function} handleDropdownChange - The function to handle dropdown changes
 * @param {Function} getData - Function to retrieve data
 * @param {Object} dom - The DOM utilities object
 * @returns {Function} An event handler function for dropdown changes
 */
export const createOutputDropdownHandler =
  (handleDropdownChange, getData, dom) => event =>
    handleDropdownChange(event.currentTarget, getData, dom);

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
  return e => {
    logError('Error loading module ' + modulePath + ':', e);
  };
}

/**
 * Creates a module initializer function to be called when a dynamic import completes.
 *
 * @param {HTMLElement} article - The article element containing the toy.
 * @param {string} functionName - The name of the exported function to use from the module.
 * @param {object} env - Environment object containing globalState, createEnv, getUuid, error, and fetch.
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
  return module => runModuleInitializer(module, getProcessing, initialize);
}

function makeProcessingFunction(functionName) {
  return function (module) {
    return module[functionName];
  };
}

function makeInteractiveInitializer(article, config) {
  return function (processingFunction) {
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
    getModuleInitializer(
      moduleInfo.article,
      moduleInfo.functionName,
      moduleConfig
    ),
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
  const { dom, loggers } = moduleConfig;
  const { logInfo } = loggers;
  logInfo(
    'Starting module import for article',
    moduleInfo.article.id,
    'module',
    moduleInfo.modulePath
  );
  importModuleForIntersection(moduleInfo, moduleConfig);
  dom.disconnectObserver(observer);
}

function getEntryHandler(moduleInfo, moduleConfig) {
  const { dom } = moduleConfig;
  return observer => entry => {
    if (dom.isIntersecting(entry)) {
      handleIntersectingEntry(observer, moduleInfo, moduleConfig);
    }
  };
}

/**
 * Creates a moduleConfig object from env and dom
 * @param {object} env - Environment including getUuid
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
    dom,
    getUuid: env.getUuid,
  };
}

export function makeObserverCallback(moduleInfo, env, dom) {
  const moduleConfig = makeModuleConfig(env, dom);
  moduleConfig.loggers = createPrefixedLoggers(
    moduleConfig.loggers,
    `[${moduleInfo.article.id}]`
  );
  const handleEntryFactory = getEntryHandler(moduleInfo, moduleConfig);
  const logInfo = moduleConfig.loggers.logInfo;
  return (entries, observer) => {
    const handleEntry = handleEntryFactory(observer);
    entries.forEach(entry => {
      logInfo('Observer callback for article', moduleInfo.article.id);
      handleEntry(entry);
    });
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

export function getText(response) {
  return response.text();
}

export function makeDisplayBody(dom, parent, presenterKey) {
  return body => {
    setTextContent({ content: body, presenterKey }, dom, parent);
  };
}

export function getFetchErrorHandler(env, parent, presenterKey) {
  const { dom, errorFn } = env;
  return error => {
    errorFn('Error fetching request URL:', error);
    setTextContent(
      { content: 'Error fetching URL: ' + error.message, presenterKey },
      dom,
      parent
    );
    dom.addWarning(parent);
  };
}

export function handleRequestResponse(url, env, options) {
  const { parent, presenterKey } = options;
  const { fetchFn, dom } = env;
  const displayBody = makeDisplayBody(dom, parent, presenterKey);
  const handleFetchError = getFetchErrorHandler(env, parent, presenterKey);
  fetchFn(url).then(getText).then(displayBody).catch(handleFetchError);
}

import { isObject } from './common.js';

/**
 * Creates a number input element with the specified value and change handler
 * @param {string} value - The initial value for the input
 * @param {Function} onChange - The callback to execute when the input value changes
 * @param {Object} dom - The DOM utilities object
 * @returns {HTMLInputElement} The created number input element
 */
export const createNumberInput = (value, onChange, dom) => {
  const input = createBaseNumberInput(dom);
  if (value) {
    dom.setValue(input, value);
  }
  setupInputEvents(input, onChange, dom);
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
const positionNumberInput = ({ container, textInput, numberInput, dom }) => {
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
    positionNumberInput({
      container,
      textInput,
      numberInput,
      dom,
    });
  }

  return numberInput;
};

/**
 * Creates an event handler that updates a text input's value from an event
 * @param {HTMLInputElement} textInput - The text input element to update
 * @param {Object} dom - The DOM utilities object
 * @returns {Function} An event handler function
 */
export const createUpdateTextInputValue = (textInput, dom) => event => {
  const targetValue = dom.getTargetValue(event);
  dom.setValue(textInput, targetValue);
};

function hasRequestField(val) {
  return Object.prototype.hasOwnProperty.call(val, 'request');
}

function hasStringUrl(val) {
  return val.request && typeof val.request.url === 'string';
}

/**
 * Creates a key input event handler for a key-value row
 * @param {Object} options - Function options
 * @param {Object} options.dom - The DOM utilities object
 * @param {HTMLElement} options.keyEl - The key input element
 * @param {HTMLElement} options.textInput - The hidden text input element
 * @param {Object} options.rows - The rows object containing key-value pairs
 * @param {Function} options.syncHiddenField - Function to sync the hidden field with current state
 * @returns {Function} The event handler function
 */
export function createKeyInputHandler(options) {
  const { dom, keyEl, textInput, rows, syncHiddenField } = options;
  return e => {
    const prevKey = dom.getDataAttribute(keyEl, 'prevKey');
    const newKey = dom.getTargetValue(e);

    // If nothing changed, just keep the hidden JSON fresh.
    if (newKey === prevKey) {
      syncHiddenField(textInput, rows, dom);
      return;
    }

    // If the new key is non‑empty and unique, migrate the value.
    if (newKey !== '' && !(newKey in rows)) {
      rows[newKey] = rows[prevKey];
      delete rows[prevKey];
      dom.setDataAttribute(keyEl, 'prevKey', newKey); // track latest key name
    }
    // Otherwise (empty or duplicate), leave the mapping under prevKey.

    syncHiddenField(textInput, rows, dom);
  };
}

/**
 * Creates a value input event handler for a key-value row
 * @param {Object} dom - The DOM utilities object
 * @param {HTMLElement} keyEl - The key input element
 * @param {HTMLElement} textInput - The hidden text input element
 * @param {Object} rows - The rows object containing key-value pairs
 * @param {Function} syncHiddenField - Function to sync the hidden field with current state
 * @returns {Function} The event handler function
 */
export function createValueInputHandler(options) {
  const { dom, keyEl, textInput, rows, syncHiddenField } = options;
  return e => {
    const rowKey = dom.getDataAttribute(keyEl, 'prevKey'); // may have changed via onKey
    rows[rowKey] = dom.getTargetValue(e);
    syncHiddenField(textInput, rows, dom);
  };
}

/**
 * Creates a key input element with event listeners
 * @param {Object} options - Function options
 * @param {Object} options.dom - The DOM utilities object
 * @param {string} options.key - The initial key value
 * @param {HTMLElement} options.textInput - The hidden text input element
 * @param {Object} options.rows - The rows object containing key-value pairs
 * @param {Function} options.syncHiddenField - Function to sync the hidden field with current state
 * @param {Array<Function>} options.disposers - Array to store cleanup functions
 * @returns {HTMLInputElement} The created key input element
 */
export const createKeyElement = ({
  dom,
  key,
  textInput,
  rows,
  syncHiddenField,
  disposers,
}) => {
  const keyEl = dom.createElement('input');
  dom.setType(keyEl, 'text');
  dom.setPlaceholder(keyEl, 'Key');
  dom.setValue(keyEl, key);
  // store the current key so we can track renames without re‑rendering
  dom.setDataAttribute(keyEl, 'prevKey', key);

  const onKey = createKeyInputHandler({
    dom,
    keyEl,
    textInput,
    rows,
    syncHiddenField,
  });
  dom.addEventListener(keyEl, 'input', onKey);
  const removeKeyListener = () =>
    dom.removeEventListener(keyEl, 'input', onKey);
  disposers.push(removeKeyListener);

  return keyEl;
};

/**
 * Creates a value input element with event listeners
 * @param {Object} options - Function options
 * @param {Object} options.dom - The DOM utilities object
 * @param {string} options.value - The initial value
 * @param {HTMLElement} options.keyEl - The corresponding key input element
 * @param {HTMLElement} options.textInput - The hidden text input element
 * @param {Object} options.rows - The rows object containing key-value pairs
 * @param {Function} options.syncHiddenField - Function to sync the hidden field with current state
 * @param {Array<Function>} options.disposers - Array to store cleanup functions
 * @returns {HTMLInputElement} The created value input element
 */
export const createValueElement = ({
  dom,
  value,
  keyEl,
  textInput,
  rows,
  syncHiddenField,
  disposers,
}) => {
  const valueEl = dom.createElement('input');
  dom.setType(valueEl, 'text');
  dom.setPlaceholder(valueEl, 'Value');
  dom.setValue(valueEl, value);

  const onValue = createValueInputHandler({
    dom,
    keyEl,
    textInput,
    rows,
    syncHiddenField,
  });
  dom.addEventListener(valueEl, 'input', onValue);
  const removeValueListener = createRemoveValueListener(dom, valueEl, onValue);
  disposers.push(removeValueListener);

  return valueEl;
};

/**
 * Creates an add button click handler for key-value rows
 * @param {Object} rows - The rows object containing key-value pairs
 * @param {Function} render - Function to re-render the key-value editor
 * @returns {Function} The click event handler function
 */
export const createOnAddHandler = (rows, render) => {
  return () => {
    // Add a new empty key only if there isn't already one
    if (!Object.prototype.hasOwnProperty.call(rows, '')) {
      rows[''] = '';
      render();
    }
  };
};

/**
 * Creates an event handler for removing a key-value row
 * @param {Object} rows - The rows object containing key-value pairs
 * @param {Function} render - The render function to update the UI
 * @param {string} key - The key to remove
 * @returns {Function} The event handler function
 */
export const createOnRemove = (rows, render, key) => e => {
  e.preventDefault();
  delete rows[key];
  render();
};

/**
 * Sets up an add button with a click handler that adds a new row
 * @param {Object} dom - The DOM utilities object
 * @param {HTMLElement} button - The button element to set up
 * @param {Object} rows - The rows object to add a new row to
 * @param {Function} render - The render function to update the UI
 * @param {Array} disposers - Array to store cleanup functions
 */
export const setupAddButton = ({ dom, button, rows, render, disposers }) => {
  dom.setTextContent(button, '+');
  const onAdd = createOnAddHandler(rows, render);
  dom.addEventListener(button, 'click', onAdd);
  const removeAddListener = createRemoveAddListener(dom, button, onAdd);
  disposers.push(removeAddListener);
};

/**
 * Sets up a remove button with a click handler that removes the corresponding row
 * @param {Object} dom - The DOM utilities object
 * @param {HTMLElement} button - The button element to set up
 * @param {Object} rows - The rows object containing the row to remove
 * @param {Function} render - The render function to update the UI
 * @param {string} key - The key of the row to remove
 * @param {Array} disposers - Array to store cleanup functions
 */
export const setupRemoveButton = (
  dom,
  button,
  rows,
  render,
  key,
  disposers
) => {
  dom.setTextContent(button, '×');
  const onRemove = createOnRemove(rows, render, key);
  dom.addEventListener(button, 'click', onRemove);
  const removeRemoveListener = createRemoveRemoveListener(
    dom,
    button,
    onRemove
  );
  disposers.push(removeRemoveListener);
};

/**
 * Creates and sets up a button element as either an add or remove button
 * @param {Object} opts - Options for button creation
 * @param {Object} opts.dom - The DOM utilities object
 * @param {boolean} opts.isAddButton - Whether to create an add button
 * @param {Object} opts.rows - The rows object for the key-value editor
 * @param {Function} opts.render - The render function to update the UI
 * @param {string} opts.key - The key of the row (for remove button)
 * @param {Array} opts.disposers - Array to store cleanup functions
 * @returns {HTMLElement} The created and configured button element
 */
/**
 * Creates a function that creates and appends a key-value row to the container
 * @param {Object} dom - The DOM utilities object
 * @param {Array} entries - The array of all key-value entries
 * @param {HTMLInputElement} textInput - The hidden input element
 * @param {Object} rows - The rows object containing all key-value pairs
 * @param {Function} syncHiddenField - Function to sync the hidden field
 * @param {Array} disposers - Array to store cleanup functions
 * @param {Function} render - The render function to update the UI
 * @param {HTMLElement} container - The container to append the row to
 * @returns {Function} A function that takes [key, value] and index and creates a row
 */
export const createKeyValueRow =
  ({
    dom,
    entries,
    textInput,
    rows,
    syncHiddenField,
    disposers,
    render,
    container,
  }) =>
    ([key, value], idx) => {
      const rowEl = dom.createElement('div');
      dom.setClassName(rowEl, 'kv-row');

      // Create key and value elements
      const keyEl = createKeyElement({
        dom,
        key,
        textInput,
        rows,
        syncHiddenField,
        disposers,
      });
      const valueEl = createValueElement({
        dom,
        value,
        keyEl,
        textInput,
        rows,
        syncHiddenField,
        disposers,
      });

      // Create and set up the appropriate button type
      const btnEl = createButton({
        dom,
        isAddButton: idx === entries.length - 1,
        rows,
        render,
        key,
        disposers,
      });

      dom.appendChild(rowEl, keyEl);
      dom.appendChild(rowEl, valueEl);
      dom.appendChild(rowEl, btnEl);
      dom.appendChild(container, rowEl);
    };

const createButton = ({ dom, isAddButton, rows, render, key, disposers }) => {
  const button = dom.createElement('button');
  dom.setType(button, 'button');

  if (isAddButton) {
    setupAddButton({ dom, button, rows, render, disposers });
  } else {
    setupRemoveButton(dom, button, rows, render, key, disposers);
  }

  return button;
};

/**
 * Creates a function that removes a click event listener from a button
 * @param {Object} dom - The DOM utilities object
 * @param {HTMLElement} btnEl - The button element to remove the listener from
 * @param {Function} onRemove - The click event handler to remove
 * @returns {Function} A function that removes the click event listener
 */
const createRemoveRemoveListener = (dom, btnEl, onRemove) => () =>
  dom.removeEventListener(btnEl, 'click', onRemove);

/**
 * Creates a function that removes an event listener for value input
 * @param {Object} dom - The DOM utilities object
 * @param {HTMLElement} el - The element to remove the listener from
 * @param {Function} handler - The event handler function to remove
 * @returns {Function} A function that removes the event listener
 */
const createRemoveValueListener = (dom, el, handler) => () =>
  dom.removeEventListener(el, 'input', handler);

/**
 * Creates a function that removes an event listener for add button clicks
 * @param {Object} dom - The DOM utilities object
 * @param {HTMLElement} btnEl - The button element to remove the listener from
 * @param {Function} handler - The click event handler function to remove
 * @returns {Function} A function that removes the click event listener
 */
const createRemoveAddListener = (dom, btnEl, handler) => () =>
  dom.removeEventListener(btnEl, 'click', handler);

const parsedRequestPredicates = [isObject, hasRequestField, hasStringUrl];

export function isValidParsedRequest(parsed) {
  return parsedRequestPredicates.every(fn => fn(parsed));
}

export function handleParsedResult(parsed, env, options) {
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
export function parseJSONResult(result) {
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
  return e => {
    logError('Error processing input:', e);
    setTextContent(
      { content: 'Error: ' + e.message, presenterKey: 'text' },
      dom,
      parent
    );
    addWarning(parent);
  };
}

export function processInputAndSetOutput(elements, processingFunction, env) {
  const {
    inputElement,
    outputParentElement: parent,
    outputSelect,
    article,
  } = elements;
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

export const createHandleSubmit =
  (elements, processingFunction, env) => event => {
    const { dom } = env;
    dom.stopDefault(event);
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
 * @param {object} config - An object containing globalState, createEnvFn, errorFn, fetchFn, dom, and getUuid.
 */
export function initializeInteractiveComponent(
  article,
  processingFunction,
  config
) {
  const logInfo = config.loggers.logInfo;
  const { globalState, createEnvFn, errorFn, fetchFn, dom, getUuid } = config;
  const logWarning = config.loggers.logWarning;
  logInfo('Initializing interactive component for article', article.id);
  // Get the elements within the article
  const inputElement = dom.querySelector(article, 'input[type="text"]');
  const submitButton = dom.querySelector(article, 'button[type="submit"]');
  if (!inputElement || !submitButton) {
    logWarning(
      'Interactive component missing input or button in article',
      article.id
    );
    return;
  }
  // Temporary debug logging for issue investigation
  logInfo('Found input element:', inputElement);
  logInfo('Found button element:', submitButton);
  const outputParent = dom.querySelector(article, 'div.output'); // Get the parent element
  const outputSelect = dom.querySelector(article, 'select.output');

  // Disable input and submit during initialization
  disableInputAndButton(inputElement, submitButton);

  const presenterKey = 'text';
  // Update message to show JS is running, replacing <p.output> with paragraph
  const initialisingWarning = setTextContent(
    { content: 'Initialising...', presenterKey },
    dom,
    outputParent
  );

  // Use logInfo directly from config
  const env = {
    globalState,
    createEnv: createEnvFn,
    errorFn,
    fetchFn,
    dom,
    logInfo,
    getUuid,
  };
  const handleSubmit = createHandleSubmit(
    {
      inputElement,
      outputElement: initialisingWarning,
      outputParent,
      outputParentElement: outputParent,
      outputSelect,
      article,
    },
    processingFunction,
    env
  );

  // Add event listener to the submit button
  dom.addEventListener(submitButton, 'click', handleSubmit);

  // Add event listener for Enter key in the input field
  dom.addEventListener(
    inputElement,
    'keypress',
    createHandleKeyPress(handleSubmit)
  );

  // Enable controls when initialization is complete using the function from this module
  enableInteractiveControls(
    { inputElement, submitButton, parent: outputParent },
    dom,
    presenterKey
  );
}

/**
 * Returns a keypress event handler that triggers submit on Enter key.
 * @param {Function} handleSubmit - The submit handler function to call on Enter key.
 * @returns {Function} Keypress event handler.
 */
function createHandleKeyPress(handleSubmit) {
  return event => {
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
  logInfo(
    'Initializing',
    interactiveComponentCount,
    'interactive components via IntersectionObserver'
  );
  const init = env.getComponentInitializer(
    getElement,
    logWarning,
    createIntersectionObserver
  );
  interactiveComponents.forEach(init);
}

/**
 * Syncs the hidden text input field with the current state of the key-value rows.
 * Only includes non-empty key-value pairs in the output.
 * @param {HTMLInputElement} textInput - The hidden input element to update (assumed to be truthy)
 * @param {Object} rows - The key-value pairs to sync
 * @param {Object} dom - The DOM utilities object
 */
export const syncHiddenField = (textInput, rows, dom) => {
  // Only include keys with non-empty key or value
  const filtered = {};
  for (const [k, v] of Object.entries(rows)) {
    if (k || v) {
      filtered[k] = v;
    }
  }
  dom.setValue(textInput, JSON.stringify(filtered));
};

/**
 * Ensures a dynamic key/value editor exists just after the given hidden text input.
 * @param {HTMLElement} container - The container element to render the editor into
 * @param {HTMLInputElement} textInput - The hidden input element that stores the JSON string
 * @param {Object} dom - The DOM utilities object
 * @returns {HTMLElement} The container element for the key-value editor
 */
/**
 * Creates a render function with access to the given disposers array and rows
 * @param {Object} dom - The DOM utilities object
 * @param {Array} disposersArray - Array to store cleanup functions
 * @param {HTMLElement} container - The container element for the key-value pairs
 * @param {Object} rows - The rows object containing key-value pairs
 * @param {HTMLInputElement} textInput - The hidden input element
 * @param {Function} syncHiddenField - Function to sync the hidden field
 * @returns {Function} The render function
 */
export const createRenderer = (
  dom,
  disposersArray,
  container,
  rows,
  textInput,
  syncHiddenField
) => {
  /**
   * Renders the key-value input UI
   */
  const render = () => {
    clearDisposers(disposersArray);
    dom.removeAllChildren(container);

    // If no keys, add a single empty row
    if (Object.keys(rows).length === 0) {
      rows[''] = '';
    }

    const entries = Object.entries(rows);
    entries.forEach(
      createKeyValueRow({
        dom,
        entries,
        textInput,
        rows,
        syncHiddenField,
        disposers: disposersArray,
        render,
        container,
      })
    );

    syncHiddenField(textInput, rows, dom);
  };

  return render;
};

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
  const rows = parseExistingRows(dom, textInput);
  const disposers = [];

  // Create the render function with the required dependencies
  const render = createRenderer(
    dom,
    disposers,
    kvContainer,
    rows,
    textInput,
    syncHiddenField
  );

  // Initial render
  render();

  // Public API for cleanup by parent code
  const dispose = createDispose({
    disposers,
    dom,
    container: kvContainer,
    rows,
  });
  kvContainer._dispose = dispose;

  return kvContainer;
};

/**
 * New version: accepts a config object and delegates to the original.
 * @param {object} config - An object containing win, doc, logFn, warnFn, getElementByIdFn, and createIntersectionObserverFn.
 */

/**
 * Creates a function that initializes dropdown event listeners
 * @param {Function} onOutputChange - Handler for output dropdown changes
 * @param {Function} onInputChange - Handler for input dropdown changes
 * @param {Object} dom - The DOM utilities object
 * @returns {Function} A function that initializes dropdown event listeners
 */
export const createDropdownInitializer = (
  onOutputChange,
  onInputChange,
  dom
) => {
  return () => {
    const outputDropdowns = Array.from(
      dom.querySelectorAll('article.entry .value > select.output')
    );
    outputDropdowns.forEach(dropdown => {
      onOutputChange({ currentTarget: dropdown });
      createAddDropdownListener(onOutputChange, dom)(dropdown);
    });

    // Add event listeners to toy input dropdowns
    const inputDropdowns = Array.from(
      dom.querySelectorAll('article.entry .value > select.input')
    );
    inputDropdowns.forEach(dropdown => {
      onInputChange({ currentTarget: dropdown });
      createAddDropdownListener(onInputChange, dom)(dropdown);
    });
  };
};

/**
 * Helper function needed by getData
 */
export const getDeepStateCopy = globalState =>
  JSON.parse(JSON.stringify(globalState));
