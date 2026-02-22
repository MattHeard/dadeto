import { blogKeyHandler } from './inputHandlers/blogKeyHandler.js';
import { createParagraphElement } from './presenters/paragraph.js';
import { createPrefixedLoggers } from './document.js';
import { deepClone } from '../core/browser/browser-core.js';
import {
  createRemoveListener,
  defaultHandler,
  getInputValue,
  hideAndDisable,
  maybeRemoveNumber,
  maybeRemoveTextarea,
  maybeRemoveDendrite,
  parseJsonOrDefault,
  setInputValue,
  dendritePageHandler,
  dendriteStoryHandler,
} from './browser-core.js';

/**
 * Determines whether a value is a key/value pair object.
 * @param {object} pair - Value to check.
 * @returns {boolean} True if pair has a {@code key} property.
 */
function isKeyValuePair(pair) {
  return 'key' in Object(pair);
}

/**
 * Converts an array of {@code {key, value}} objects to a plain object.
 * @param {Array<{key: string, value: any}>} array - Array to convert.
 * @returns {object} Object with keys mapped to values.
 */
export const convertArrayToKeyValueObject = array => {
  if (!Array.isArray(array)) {
    return {};
  }
  return Object.fromEntries(
    array.filter(isKeyValuePair).map(pair => [pair.key, pair.value ?? ''])
  );
};

/**
 * Normalizes previously stored rows into an object.
 * @param {unknown} existing - Existing rows value.
 * @returns {object} Normalized rows object.
 */
function normalizeExisting(existing) {
  const converters = [
    [Array.isArray, convertArrayToKeyValueObject],
    [value => value && typeof value === 'object', value => ({ ...value })],
  ];
  const match = converters.find(([check]) => check(existing));
  if (match) {
    return match[1](existing);
  }
  return {};
}

/**
 * Checks if a value is empty or {@code undefined}.
 * @param {*} value - Value to check.
 * @returns {boolean} True if value is blank.
 */
function isBlank(value) {
  return value === '' || value === undefined;
}

/**
 * Returns the JSON string to parse for rows.
 * @param {string} value - Raw value from the input element.
 * @returns {string} The JSON to parse.
 */
function getDefaultRowsJson(value) {
  if (isBlank(value)) {
    return '{}';
  }
  return value;
}

/**
 * Retrieves the current value from DOM utilities if available.
 * @param {object} dom - DOM utilities.
 * @param {HTMLElement} inputElement - Input element whose value is read.
 * @returns {string|undefined} Value reported by the DOM helpers.
 */
function getDomValue(dom, inputElement) {
  const { getValue } = Object(dom);
  if (typeof getValue !== 'function') {
    return undefined;
  }
  return getValue.call(dom, inputElement);
}

/**
 * Selects the first candidate value that is not blank.
 * @param {...*} candidates - Values to inspect.
 * @returns {*|undefined} The first non-blank candidate.
 */
function pickFirstNonBlank(...candidates) {
  return candidates.find(candidate => !isBlank(candidate));
}

/**
 * Retrieves the JSON string from the input element.
 * @param {object} dom - DOM utilities.
 * @param {HTMLElement} inputElement - Text input element.
 * @returns {string} JSON string to parse.
 */
function getRowsJson(dom, inputElement) {
  const preferredValue = pickFirstNonBlank(
    getInputValue(inputElement),
    getDomValue(dom, inputElement)
  );

  return getDefaultRowsJson(preferredValue);
}

/**
 * Parses the existing rows stored in a hidden input field.
 * @param {object} dom - DOM utilities.
 * @param {HTMLInputElement} inputElement - Hidden input containing JSON.
 * @returns {object} Normalized rows object.
 */
export const parseExistingRows = (dom, inputElement) => {
  const jsonToParse = getRowsJson(dom, inputElement);
  const existing = parseJsonOrDefault(jsonToParse, {});
  return normalizeExisting(existing);
};

/**
 * Clears all disposer functions and empties the array.
 * @param {Array<Function>} disposersArray - Array of disposer functions.
 * @returns {void}
 */
export const clearDisposers = disposersArray => {
  disposersArray.forEach(fn => fn());
  disposersArray.length = 0; // Clear array in place for better performance
};

/**
 * Factory for creating a dispose function.
 * @param {object} config - Configuration object.
 * @param {Array<Function>} config.disposers - Disposer callbacks.
 * @param {object} config.dom - DOM utilities object.
 * @param {HTMLElement} config.container - Container element to clear.
 * @param {Array} config.rows - Rows array to reset.
 * @returns {Function} Cleanup function.
 */
export const createDispose = config => {
  const { disposers, dom, container, rows } = config;
  return () => {
    clearDisposers(disposers);
    dom.removeAllChildren(container);
    rows.length = 0;
  };
};

import { createPreElement } from './presenters/pre.js';
import { createTicTacToeBoardElement } from './presenters/ticTacToeBoard.js';
import { createBattleshipFleetBoardElement } from './presenters/battleshipSolitaireFleet.js';
import { createBattleshipCluesBoardElement } from './presenters/battleshipSolitaireClues.js';

/**
 * Creates a handler for input dropdown changes
 * @param {Function} onChange - The change handler function
 * @param {object} dom - The DOM utilities object
 * @returns {Function} The event handler function for input dropdown changes
 */
export const createAddDropdownListener = (onChange, dom) => dropdown => {
  dom.addEventListener(dropdown, 'change', onChange);
};

import { textHandler } from './inputHandlers/text.js';
import { textareaHandler } from './inputHandlers/textarea.js';
import { numberHandler } from './inputHandlers/number.js';
import { moderatorRatingsHandler } from './inputHandlers/moderatorRatings.js';
import { KV_CONTAINER_SELECTOR } from '../core/browser/browser-core.js';

export const ensureKeyValueInput = (container, textInput, dom) => {
  let kvContainer = dom.querySelector(container, KV_CONTAINER_SELECTOR);
  if (!kvContainer) {
    kvContainer = dom.createElement('div');
    dom.setClassName(kvContainer, KV_CONTAINER_SELECTOR.slice(1));
    const nextSibling = dom.getNextSibling(textInput);
    dom.insertBefore(container, kvContainer, nextSibling);
  }

  const rows = parseExistingRows(dom, textInput);
  const disposers = [];

  const rowData = {
    rows,
    rowTypes: Object.fromEntries(Object.keys(rows).map(k => [k, 'string'])),
  };

  const render = createRenderer({
    dom,
    disposersArray: disposers,
    container: kvContainer,
    rowData,
    textInput,
    syncHiddenField,
  });

  render();

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
 * Ensure a key/value input UI is displayed.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element for the inputs.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function handleKVType(dom, container, textInput) {
  maybeRemoveNumber(container, dom);
  maybeRemoveDendrite(container, dom);
  maybeRemoveTextarea(container, dom);
  ensureKeyValueInput(container, textInput, dom);
}

/**
 * Main handler for key/value input fields.
 * @param {object} dom - DOM helper utilities.
 * @param {HTMLElement} container - Container element for the inputs.
 * @param {HTMLInputElement} textInput - The text input element.
 * @returns {void}
 */
export function kvHandler(dom, container, textInput) {
  hideAndDisable(textInput, dom);
  handleKVType(dom, container, textInput);
}

const inputHandlersMap = {
  text: textHandler,
  textarea: textareaHandler,
  number: numberHandler,
  kv: kvHandler,
  'blog-key': blogKeyHandler,
  'dendrite-story': dendriteStoryHandler,
  'dendrite-page': dendritePageHandler,
  'moderator-ratings': moderatorRatingsHandler,
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
 * Finds the article element containing a dropdown.
 * @param {HTMLElement} dropdown - Dropdown element.
 * @returns {HTMLElement} Article element hosting the dropdown.
 */
function getDropdownArticle(dropdown) {
  return dropdown.closest('article.entry');
}

/**
 * Gets the post id for a dropdown element.
 * @param {HTMLElement} dropdown - Dropdown element.
 * @returns {string} The post id.
 */
function getDropdownPostId(dropdown) {
  const article = getDropdownArticle(dropdown);
  return article.id;
}

/**
 * Updates output based on dropdown selection.
 * @param {HTMLSelectElement} dropdown - Dropdown element.
 * @param {Function} getData - Function returning application data.
 * @param {object} dom - DOM utilities.
 */
export function handleDropdownChange(dropdown, getData, dom) {
  const postId = getDropdownPostId(dropdown);
  const selectedValue = dropdown.value;
  const parent = dom.querySelector(dropdown.parentNode, 'div.output');
  const { output } = getData();
  const content = outputForPostId(output, postId);

  setTextContent({ presenterKey: selectedValue, content }, dom, parent);
}

/**
 * Checks if there is output for a given post id.
 * @param {object} output - Output mapping.
 * @param {string} postId - Post id to check.
 * @returns {boolean} True if output exists.
 */
function hasOutputForPostId(output, postId) {
  return Boolean(output?.[postId]);
}

/**
 * Retrieves output string for a post id.
 * @param {object} output - Output mapping.
 * @param {string} postId - Post id.
 * @returns {string} Output string or empty string.
 */
function outputForPostId(output, postId) {
  if (hasOutputForPostId(output, postId)) {
    return output[postId];
  }
  return '';
}

/**
 * Creates a handler function for output dropdown changes.
 * @param {Function} handleDropdownChange - The function to handle dropdown changes
 * @param {Function} getData - Function to retrieve data
 * @param {object} dom - The DOM utilities object
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

/**
 * Renders output content using the appropriate presenter.
 * @param {{presenterKey: string, content: string}} output - Output data.
 * @param {object} dom - DOM utilities.
 * @param {HTMLElement} parent - Element to contain the rendered content.
 * @returns {HTMLElement} The rendered child element.
 */
function setTextContent(output, dom, parent) {
  dom.removeAllChildren(parent);
  const presenter = presentersMap[output.presenterKey];
  const child = presenter(output.content, dom);
  dom.appendChild(parent, child);
  return child;
}
/**
 * Creates an error handler for module loading errors.
 * @param {string} modulePath - Path to the module that failed to load.
 * @param {Function} logError - Error logging function.
 * @returns {Function} Error handler function.
 */
export function handleModuleError(modulePath, logError) {
  return e => {
    logError(`Error loading module ${modulePath}:`, e);
  };
}

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

/**
 * Creates a function that extracts a named export from a module.
 * @param {string} functionName - Name of the export.
 * @returns {Function} Function that gets the export from a module.
 */
function makeProcessingFunction(functionName) {
  return function (module) {
    return module[functionName];
  };
}

/**
 * Generates a function that initializes a component with a processing function.
 * @param {HTMLElement} article - Article element hosting the component.
 * @param {object} config - Module configuration.
 * @returns {Function} Initializer function.
 */
function makeInteractiveInitializer(article, config) {
  return function (processingFunction) {
    initializeInteractiveComponent(article, processingFunction, config);
  };
}

/**
 * Runs the initializer using the processing function from the module.
 * @param {object} module - Loaded module object.
 * @param {Function} getProcessing - Function to get processing function.
 * @param {Function} initialize - Initializer callback.
 */
function runModuleInitializer(module, getProcessing, initialize) {
  const processingFunction = getProcessing(module);
  initialize(processingFunction);
}

/**
 * Dynamically imports a module for an intersection event.
 * @param {object} moduleInfo - Module information including path and article.
 * @param {object} moduleConfig - Configuration for module import.
 */
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
 * Handles an intersection event by importing the module and disconnecting the
 * observer.
 * @param {IntersectionObserver} observer - The observer reporting the entry.
 * @param {{article: HTMLElement, modulePath: string, functionName: string}} moduleInfo -
 *   Information about the module to import.
 * @param {object} moduleConfig - Configuration with DOM helpers and loggers.
 * @returns {void}
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

/**
 * Creates a handler for IntersectionObserver entries.
 * @param {{article: HTMLElement, modulePath: string, functionName: string}} moduleInfo -
 *   Module information.
 * @param {object} moduleConfig - Configuration with DOM helpers and loggers.
 * @returns {Function} Entry handler factory.
 */
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

/**
 * Create a callback for an IntersectionObserver that handles entries
 * for a specific module.
 * @param {{article: HTMLElement, modulePath: string, functionName: string}} moduleInfo
 *   Information about the module being observed.
 * @param {object} env - Environment containing loggers and other helpers.
 * @param {object} dom - DOM utilities used to create observers.
 * @returns {(entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void}
 *   Observer callback processing each entry.
 */
export function makeObserverCallback(moduleInfo, env, dom) {
  const moduleConfig = makeModuleConfig(env, dom);
  moduleConfig.loggers = createPrefixedLoggers(
    moduleConfig.loggers,
    `[${moduleInfo.article.id}]`
  );
  const handleEntryFactory = getEntryHandler(moduleInfo, moduleConfig);
  return (entries, observer) => {
    const handleEntry = handleEntryFactory(observer);
    entries.forEach(entry => {
      handleEntry(entry);
    });
  };
}

/**
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
 * Enable controls and update the status message for an interactive component.
 * @param {{inputElement: HTMLInputElement, submitButton: HTMLButtonElement, parent: HTMLElement}} elements -
 *   Elements that make up the interactive component.
 * @param {object} dom - DOM helper object.
 * @param {string} presenterKey - Presenter key to use when rendering output.
 * @returns {void}
 */
export function enableInteractiveControls(elements, dom, presenterKey) {
  const { inputElement, submitButton, parent } = elements;
  const readyMessage = 'Ready for input';
  dom.enable(inputElement);
  dom.enable(submitButton);
  setTextContent({ content: readyMessage, presenterKey }, dom, parent);
  dom.removeWarning(parent);
}

/**
 * Extracts the response body text.
 * @param {Response} response - The fetch response object.
 * @returns {Promise<string>} Resolves with the response text.
 */
export function getText(response) {
  return response.text();
}

/**
 * Creates a function that displays fetched body text using a presenter.
 * @param {object} dom - DOM helper object.
 * @param {HTMLElement} parent - Parent element to render into.
 * @param {string} presenterKey - Presenter key for rendering output.
 * @returns {Function} Display callback accepting body text.
 */
export function makeDisplayBody(dom, parent, presenterKey) {
  return body => {
    setTextContent({ content: body, presenterKey }, dom, parent);
  };
}

/**
 * Creates a fetch error handler that logs and displays an error message.
 * @param {object} env - Environment object with dom and errorFn.
 * @param {HTMLElement} parent - Element to display the error in.
 * @param {string} presenterKey - Presenter key for rendering output.
 * @returns {Function} Error handler callback.
 */
export function getFetchErrorHandler(env, parent, presenterKey) {
  const { dom, errorFn } = env;
  return error => {
    errorFn('Error fetching request URL:', error);
    setTextContent(
      { content: `Error fetching URL: ${error.message}`, presenterKey },
      dom,
      parent
    );
    dom.addWarning(parent);
  };
}

/**
 * Fetches a URL and displays the response body.
 * @param {string} url - The request URL.
 * @param {object} env - Environment containing fetchFn and dom helpers.
 * @param {{parent: HTMLElement, presenterKey: string}} options - Display options.
 * @returns {void}
 */
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
 * @param {object} dom - The DOM utilities object
 * @returns {HTMLInputElement} The created number input element
 */

/**
 * Check whether a value contains a `request` field.
 * @param {object} val - Value to inspect.
 * @returns {boolean} `true` if `val.request` exists.
 */
function hasRequestField(val) {
  return Object.hasOwn(val, 'request');
}

/**
 * Check whether a value contains a request with a string URL.
 * @param {object} val - Value to inspect.
 * @returns {boolean} `true` if `val.request.url` is a string.
 */
function hasStringUrl(val) {
  return val.request && typeof val.request.url === 'string';
}

/**
 * Checks if a key is unique and non-empty.
 * @param {string} key - Key to validate.
 * @param {object} rows - Current rows map.
 * @returns {boolean} True if the key is unique and not blank.
 */
function isUniqueNonEmpty(key, rows) {
  if (key === '') {
    return false;
  }
  return !(key in rows);
}

/**
 * Migrate an entry to a new key if the key is unique and non-empty.
 * @param {object} params - Options object.
 * @param {string} params.prevKey - Current key.
 * @param {string} params.newKey - Proposed new key.
 * @param {object} params.rows - Map of row values by key.
 * @param {HTMLElement} params.keyEl - Key input element.
 * @param {object} params.dom - DOM utilities.
 * @returns {void}
 */
function migrateRowIfValid({ prevKey, newKey, rowData, keyEl, dom }) {
  if (isUniqueNonEmpty(newKey, rowData.rows)) {
    rowData.rows[newKey] = rowData.rows[prevKey];
    rowData.rowTypes[newKey] = rowData.rowTypes[prevKey] ?? 'string';
    delete rowData.rows[prevKey];
    delete rowData.rowTypes[prevKey];
    dom.setDataAttribute(keyEl, 'prevKey', newKey);
  }
}

/**
 * Creates an input handler for key changes.
 * @param {object} options - Configuration.
 * @param {object} options.dom - DOM utilities.
 * @param {HTMLElement} options.keyEl - Input for the key.
 * @param {HTMLInputElement} options.textInput - Hidden JSON field.
 * @param {object} options.rowData - Row data object containing rows and rowTypes.
 * @param {Function} options.syncHiddenField - Syncs the hidden field.
 * @returns {Function} Event handler for key input.
 */
export function createKeyInputHandler(options) {
  const { dom, keyEl, textInput, rowData, syncHiddenField } = options;
  return e => {
    const prevKey = dom.getDataAttribute(keyEl, 'prevKey');
    const newKey = dom.getTargetValue(e);

    // If nothing changed, just keep the hidden JSON fresh.
    if (newKey === prevKey) {
      syncHiddenField(textInput, rowData ?? { rows: {}, rowTypes: {} }, dom);
      return;
    }

    migrateRowIfValid({ prevKey, newKey, rowData: rowData ?? { rows: {}, rowTypes: {} }, keyEl, dom });
    syncHiddenField(textInput, rowData ?? { rows: {}, rowTypes: {} }, dom);
  };
}

/**
 * Creates a value input event handler for a key-value row.
 * @param {object} options - Configuration.
 * @param {object} options.dom - DOM utilities.
 * @param {HTMLElement} options.keyEl - Key input element.
 * @param {HTMLInputElement} options.textInput - Hidden JSON input.
 * @param {object} options.rowData - Row data object containing rows and rowTypes.
 * @param {Function} options.syncHiddenField - Updates the hidden field.
 * @returns {Function} The event handler.
 */
export function createValueInputHandler(options) {
  const { dom, keyEl, textInput, rowData, syncHiddenField } = options;
  return e => {
    const rowKey = dom.getDataAttribute(keyEl, 'prevKey'); // may have changed via onKey
    rowData.rows[rowKey] = dom.getTargetValue(e);
    syncHiddenField(textInput, rowData ?? { rows: {}, rowTypes: {} }, dom);
  };
}

/**
 * Creates a key input element with event listeners
 * @param {object} options - Function options
 * @param {object} options.dom - The DOM utilities object
 * @param {string} options.key - The initial key value
 * @param {HTMLElement} options.textInput - The hidden text input element
 * @param {object} options.rows - The rows object containing key-value pairs
 * @param {Function} options.syncHiddenField - Function to sync the hidden field with current state
 * @param {Array<Function>} options.disposers - Array to store cleanup functions
 * @returns {HTMLInputElement} The created key input element
 */
export const createKeyElement = ({
  dom,
  key,
  textInput,
  rowData,
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
    rowData,
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
 * @param {object} options - Function options
 * @param {object} options.dom - The DOM utilities object
 * @param {string} options.value - The initial value
 * @param {HTMLElement} options.keyEl - The corresponding key input element
 * @param {HTMLElement} options.textInput - The hidden text input element
 * @param {object} options.rowData - Row data object containing rows and rowTypes.
 * @param {Function} options.syncHiddenField - Function to sync the hidden field with current state
 * @param {Array<Function>} options.disposers - Array to store cleanup functions
 * @returns {HTMLInputElement} The created value input element
 */
export const createValueElement = ({
  dom,
  value,
  keyEl,
  textInput,
  rowData,
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
    rowData,
    syncHiddenField,
  });
  dom.addEventListener(valueEl, 'input', onValue);
  const removeValueListener = createRemoveListener({
    dom,
    el: valueEl,
    event: 'input',
    handler: onValue,
  });
  disposers.push(removeValueListener);

  return valueEl;
};

const TYPE_OPTIONS = ['string', 'number', 'boolean', 'json'];

/**
 * Create a toggle button that shows and hides the type select element.
 * @param {object} options - Configuration options.
 * @param {object} options.dom - DOM helper utilities.
 * @param {HTMLElement} options.typeSelectEl - The type select element to toggle.
 * @param {Array<Function>} options.disposers - Array to register cleanup functions.
 * @returns {HTMLElement} The toggle button element.
 */
export const createTypeToggleButton = ({ dom, typeSelectEl, disposers }) => {
  const btn = dom.createElement('button');
  dom.setType(btn, 'button');
  dom.setTextContent(btn, '\u25be');
  dom.addClass(btn, 'kv-type-toggle');
  dom.hide(typeSelectEl);

  let hidden = true;

  const onToggle = () => {
    if (hidden) {
      dom.reveal(typeSelectEl);
    } else {
      dom.hide(typeSelectEl);
    }

    hidden = !hidden;
  };

  dom.addEventListener(btn, 'click', onToggle);
  const removeToggleListener = createRemoveListener({
    dom,
    el: btn,
    event: 'click',
    handler: onToggle,
  });
  disposers.push(removeToggleListener);

  return btn;
};

/**
 * Create the type selector <select> element for a kv row.
 * @param {object} options - Configuration options.
 * @param {object} options.dom - DOM helper utilities.
 * @param {string} options.key - Current row key (used for rowTypes lookup).
 * @param {object} options.rowData - Row data object containing rows and rowTypes.
 * @param {HTMLElement} options.textInput - Hidden input element for syncHiddenField.
 * @param {HTMLElement} options.keyEl - Key input element (to read current key).
 * @param {Function} options.syncHiddenField - Function to sync the hidden field.
 * @param {Array<Function>} options.disposers - Array to register cleanup functions.
 * @returns {HTMLElement} The type select element.
 */
export const createTypeElement = ({
  dom,
  key,
  rowData,
  textInput,
  keyEl,
  syncHiddenField,
  disposers,
}) => {
  const selectEl = dom.createElement('select');
  dom.addClass(selectEl, 'kv-type');

  TYPE_OPTIONS.forEach(opt => {
    const option = dom.createElement('option');
    dom.setValue(option, opt);
    dom.setTextContent(option, opt);
    dom.appendChild(selectEl, option);
  });

  const currentType = rowData.rowTypes[key] ?? 'string';
  dom.setValue(selectEl, currentType);

  const onChange = () => {
    const currentKey = dom.getDataAttribute(keyEl, 'prevKey') ?? key;
    rowData.rowTypes[currentKey] = String(dom.getValue(selectEl));
    syncHiddenField(textInput, rowData ?? { rows: {}, rowTypes: {} }, dom);
  };

  dom.addEventListener(selectEl, 'change', onChange);
  const removeChangeListener = createRemoveListener({
    dom,
    el: selectEl,
    event: 'change',
    handler: onChange,
  });
  disposers.push(removeChangeListener);

  return selectEl;
};

/**
 * Creates an add button click handler for key-value rows
 * @param {object} rows - The rows object containing key-value pairs
 * @param {object} rowTypes - Per-key type map to seed when a new row is added.
 * @param {Function} render - Function to re-render the key-value editor
 * @returns {Function} The click event handler function
 */
export const createOnAddHandler = (rowData, render) => {
  return () => {
    // Add a new empty key only if there isn't already one
    if (!Object.hasOwn(rowData.rows, '')) {
      rowData.rows[''] = '';
      rowData.rowTypes[''] = 'string';
      render();
    }
  };
};

/**
 * Creates an event handler for removing a key-value row
 * @param {object} rowData - Row data object containing rows and rowTypes.
 * @param {object} rowData.rows - The rows object containing key-value pairs
 * @param {object} rowData.rowTypes - Per-key type map; entry for key is deleted on remove.
 * @param {Function} render - The render function to update the UI
 * @param {string} key - The key to remove
 * @returns {Function} The event handler function
 */
export const createOnRemove = (rowData, render, key) => e => {
  e.preventDefault();
  delete rowData.rows[key];
  delete rowData.rowTypes[key];
  render();
};

/**
 * Sets up an add button with a click handler that adds a new row.
 * @param {object} options - Configuration.
 * @param {object} options.dom - DOM utilities.
 * @param {HTMLElement} options.button - Button to set up.
 * @param {object} options.rowData - Row data object containing rows and rowTypes.
 * @param {Function} options.render - Re-render function.
 * @param {Array<Function>} options.disposers - Collects cleanup callbacks.
 * @returns {void}
 */
export const setupAddButton = ({ dom, button, rowData, render, disposers }) => {
  dom.setTextContent(button, '+');
  const onAdd = createOnAddHandler(rowData ?? { rows: {}, rowTypes: {} }, render);
  dom.addEventListener(button, 'click', onAdd);
  const removeAddListener = createRemoveAddListener(dom, button, onAdd);
  disposers.push(removeAddListener);
};

/**
 * Sets up a remove button with a click handler that removes the corresponding row.
 * @param {object} options - Configuration.
 * @param {object} options.dom - DOM utilities.
 * @param {HTMLElement} options.button - Button to set up.
 * @param {object} options.rowData - Row data object containing rows and rowTypes.
 * @param {Function} options.render - Re-render function.
 * @param {string} options.key - Key of the row to remove.
 * @param {Array<Function>} options.disposers - Collects cleanup callbacks.
 * @returns {void}
 */
export const setupRemoveButton = ({
  dom,
  button,
  rowData,
  render,
  key,
  disposers,
}) => {
  dom.setTextContent(button, '×');
  const onRemove = createOnRemove(rowData ?? { rows: {}, rowTypes: {} }, render, key);
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
 * @param {object} opts - Options for button creation
 * @param {object} opts.dom - The DOM utilities object
 * @param {boolean} opts.isAddButton - Whether to create an add button
 * @param {object} opts.rows - The rows object for the key-value editor
 * @param {Function} opts.render - The render function to update the UI
 * @param {string} opts.key - The key of the row (for remove button)
 * @param {Array} opts.disposers - Array to store cleanup functions
 * @returns {HTMLElement} The created and configured button element
 */
/**
 * Creates a function that appends a key-value row to the container.
 * @param {object} options - Configuration.
 * @param {object} options.dom - DOM utilities.
 * @param {Array} options.entries - All [key, value] pairs.
 * @param {HTMLInputElement} options.textInput - Hidden JSON input.
 * @param {object} options.rows - Map of row values by key.
 * @param {object} [options.rowTypes] - Per-key type map for value coercion.
 * @param {Function} options.syncHiddenField - Updates the hidden field.
 * @param {Array<Function>} options.disposers - Collects cleanup callbacks.
 * @param {Function} options.render - Re-render function.
 * @param {HTMLElement} options.container - Container to append to.
 * @returns {(entry: [string, string], idx: number) => void} Row builder.
 */
export const createKeyValueRow =
  ({
    dom,
    entries,
    textInput,
    rowData,
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
      rowData: rowData ?? { rows: {}, rowTypes: {} },
      syncHiddenField,
      disposers,
    });
    const valueEl = createValueElement({
      dom,
      value,
      keyEl,
      textInput,
      rowData: rowData ?? { rows: {}, rowTypes: {} },
      syncHiddenField,
      disposers,
    });

    // Create type selector and toggle button (hidden by default)
    const typeEl = createTypeElement({
      dom,
      key,
      rowData: rowData ?? { rows: {}, rowTypes: {} },
      textInput,
      keyEl,
      syncHiddenField,
      disposers,
    });
    const toggleBtn = createTypeToggleButton({
      dom,
      typeSelectEl: typeEl,
      disposers,
    });

    // Create and set up the appropriate button type
    const btnEl = createButton({
      dom,
      isAddButton: idx === entries.length - 1,
      rowData: rowData ?? { rows: {}, rowTypes: {} },
      render,
      key,
      disposers,
    });

    dom.appendChild(rowEl, keyEl);
    dom.appendChild(rowEl, valueEl);
    dom.appendChild(rowEl, toggleBtn);
    dom.appendChild(rowEl, typeEl);
    dom.appendChild(rowEl, btnEl);
    dom.appendChild(container, rowEl);
  };

const createButton = ({ dom, isAddButton, rowData, render, key, disposers }) => {
  const button = dom.createElement('button');
  dom.setType(button, 'button');

  if (isAddButton) {
    setupAddButton({ dom, button, rowData, render, disposers });
  } else {
    setupRemoveButton({ dom, button, rowData, render, key, disposers });
  }

  return button;
};

/**
 * Creates a function that removes a click event listener from a button
 * @param {object} dom - The DOM utilities object
 * @param {HTMLElement} btnEl - The button element to remove the listener from
 * @param {Function} onRemove - The click event handler to remove
 * @returns {Function} A function that removes the click event listener
 */
const createRemoveRemoveListener = (dom, btnEl, onRemove) => () =>
  dom.removeEventListener(btnEl, 'click', onRemove);

/**
 * Creates a function that removes an event listener for add button clicks
 * @param {object} dom - The DOM utilities object
 * @param {HTMLElement} btnEl - The button element to remove the listener from
 * @param {Function} handler - The click event handler function to remove
 * @returns {Function} A function that removes the click event listener
 */
const createRemoveAddListener = (dom, btnEl, handler) => () =>
  dom.removeEventListener(btnEl, 'click', handler);

const parsedRequestPredicates = [isObject, hasRequestField, hasStringUrl];

/**
 * Determines if a parsed request object has the expected shape.
 * @param {object} parsed - Parsed JSON result.
 * @returns {boolean} True when the object contains a request with a URL.
 */
export function isValidParsedRequest(parsed) {
  return parsedRequestPredicates.every(fn => fn(parsed));
}

/**
 * Handles a parsed request object if it is valid.
 * @param {object} parsed - Parsed JSON result.
 * @param {object} env - Environment with fetchFn and dom helpers.
 * @param {{parent: HTMLElement, presenterKey: string}} options - Display options.
 * @returns {boolean} True if the parsed object was valid.
 */
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
/**
 * Creates an error handler for input processing failures.
 * @param {object} env - Environment containing dom and errorFn.
 * @param {HTMLElement} parent - Element to display the error in.
 * @returns {Function} Error handler callback.
 */
function createHandleInputError(env, parent) {
  const logError = env.errorFn;
  const dom = env.dom;
  const addWarning = dom.addWarning;
  return e => {
    logError('Error processing input:', e);
    setTextContent(
      { content: `Error: ${e.message}`, presenterKey: 'text' },
      dom,
      parent
    );
    addWarning(parent);
  };
}

/**
 * Processes the input value and updates the output element.
 * @param {object} elements - DOM elements used by the toy.
 * @param {Function} processingFunction - Function to process the input.
 * @param {object} env - Environment providing DOM helpers and state.
 * @returns {void}
 */
export function processInputAndSetOutput(elements, processingFunction, env) {
  const {
    inputElement,
    outputParentElement: parent,
    outputSelect,
    article,
  } = elements;
  const { createEnv, dom } = env;
  const toyEnv = createEnv();
  const inputValue = getInputValue(inputElement);
  const result = processingFunction(inputValue, toyEnv);
  // Assume article and article.id are always truthy, no need to log
  setOutput(JSON.stringify({ [article.id]: result }), toyEnv);
  const parsed = parseJSONResult(result);
  const presenterKey = outputSelect.value;
  if (!handleParsedResult(parsed, env, { parent, presenterKey })) {
    setTextContent({ content: result, presenterKey }, dom, parent);
  }
}

/**
 * Wraps processing with error handling.
 * @param {object} elements - DOM elements used by the toy.
 * @param {Function} processingFunction - Function to process the input.
 * @param {object} env - Environment providing DOM helpers and state.
 * @returns {void}
 */
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
 * Disable the input field and submit button for an interactive component.
 * @param {HTMLInputElement} inputElement - Input field to disable.
 * @param {HTMLButtonElement} submitButton - Submit button to disable.
 * @returns {void}
 */
function disableInputAndButton(inputElement, submitButton) {
  inputElement.disabled = true;
  submitButton.disabled = true;
}

/**
 * Checks for any falsy elements in the list.
 * @param {Array<HTMLElement>} elements - Elements to verify.
 * @returns {boolean} True if any element is missing.
 */
function hasMissingElement(elements) {
  return elements.some(el => !el);
}

/**
 * Retrieves the input and submit elements for a toy article.
 * @param {object} dom - DOM helper object.
 * @param {HTMLElement} article - Article containing the toy.
 * @param {Function} logWarning - Logger for missing elements.
 * @returns {{inputElement: HTMLInputElement, submitButton: HTMLButtonElement}|null}
 *   Object with elements or null if missing.
 */
function getInteractiveElements(dom, article, logWarning) {
  const inputElement = dom.querySelector(article, 'input[type="text"]');
  const submitButton = dom.querySelector(article, 'button[type="submit"]');
  if (hasMissingElement([inputElement, submitButton])) {
    logWarning(
      'Interactive component missing input or button in article',
      article.id
    );
    return null;
  }
  return { inputElement, submitButton };
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
  const elements = getInteractiveElements(dom, article, logWarning);
  if (!elements) {
    return;
  }
  const { inputElement, submitButton } = elements;
  const initialValue = inputElement?.value ?? '';
  setInputValue(inputElement, initialValue);
  const handleInputUpdate = () => {
    const nextValue = dom.getValue?.(inputElement) ?? inputElement.value;
    setInputValue(inputElement, nextValue);
  };
  dom.addEventListener(inputElement, 'input', handleInputUpdate);
  // Temporary debug logging for issue investigation
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
 * Remove entries where both key and value are empty strings.
 * @param {object} rows - Key-value pairs to filter.
 * @returns {object} Object containing only non-empty entries.
 */
const filterNonEmptyEntries = rows =>
  Object.fromEntries(Object.entries(rows).filter(([k, v]) => k || v));

/**
 * Coerce a string value to the specified type for JSON serialisation.
 * @param {string} value - Raw string value from the input field.
 * @param {string} type - Target type: 'string', 'number', 'boolean', or 'json'.
 * @returns {unknown} Coerced value; invalid number yields null, invalid json yields null.
 */
export const coerceValue = (value, type) => {
  if (type === 'number') {
    const n = parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }

  if (type === 'boolean') {
    return value.toLowerCase() === 'true';
  }

  if (type === 'json') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
};

/**
 * Synchronize the hidden field with the filtered rows.
 * @param {HTMLInputElement} textInput - Hidden input element to update.
 * @param {object} rows - Key-value pairs to serialise.
 * @param {object} rowTypes - Per-key type map used to coerce values before serialisation.
 * @param {object} dom - DOM helper utilities.
 * @returns {void}
 */
export const syncHiddenField = (textInput, rowData, dom) => {
  const filtered = filterNonEmptyEntries(rowData.rows);
  const coerced = Object.fromEntries(
    Object.entries(filtered).map(([k, v]) => [
      k,
      coerceValue(v, rowData.rowTypes[k] ?? 'string'),
    ])
  );
  const serialised = JSON.stringify(coerced);
  dom.setValue(textInput, serialised);
  setInputValue(textInput, serialised);
};

/**
 * Ensures a dynamic key/value editor exists just after the given hidden text input.
 * @param {HTMLElement} container - The container element to render the editor into
 * @param {HTMLInputElement} textInput - The hidden input element that stores the JSON string
 * @param {object} dom - The DOM utilities object
 * @returns {HTMLElement} The container element for the key-value editor
 */
/**
 * Creates a render function with access to the given disposers array and rows
 * @param {object} options - Configuration options
 * @param {object} options.dom - The DOM utilities object
 * @param {Array} options.disposersArray - Array to store cleanup functions
 * @param {HTMLElement} options.container - The container element for the key-value pairs
 * @param {object} options.rows - The rows object containing key-value pairs
 * @param {object} options.rowTypes - Per-key type map for value coercion.
 * @param {HTMLInputElement} options.textInput - The hidden input element
 * @param {Function} options.syncHiddenField - Function to sync the hidden field
 * @returns {Function} The render function
 */
export const createRenderer = options => {
  const {
    dom,
    disposersArray,
    container,
    rowData,
    textInput,
    syncHiddenField,
  } = options;
  const syncWithRowData = (ti, rd, d) => syncHiddenField(ti, rd ?? { rows: {}, rowTypes: {} }, d);
  /**
   * Renders the key-value input UI
   */
  const render = () => {
    clearDisposers(disposersArray);
    dom.removeAllChildren(container);

    // If no keys, add a single empty row
    if (Object.keys(rowData.rows).length === 0) {
      rowData.rows[''] = '';
    }

    const entries = Object.entries(rowData.rows);
    entries.forEach(
      createKeyValueRow({
        dom,
        entries,
        textInput,
        rowData,
        syncHiddenField: syncWithRowData,
        disposers: disposersArray,
        render,
        container,
      })
    );

    syncWithRowData(textInput, rowData, dom);
  };

  return render;
};

/**
 * New version: accepts a config object and delegates to the original.
 * @param {object} config - An object containing win, doc, logFn, warnFn, getElementByIdFn, and createIntersectionObserverFn.
 */

/**
 * Creates a function that initializes dropdown event listeners
 * @param {Function} onOutputChange - Handler for output dropdown changes
 * @param {Function} onInputChange - Handler for input dropdown changes
 * @param {object} dom - The DOM utilities object
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
 * Create a deep cloned copy of the provided global state.
 * @param {object} globalState - State object to clone.
 * @returns {object} A deep copy of {@code globalState}.
 */
export const getDeepStateCopy = globalState => deepClone(globalState);
