import { setupAudio } from './audio-controls.js';
import { handleTagLinks } from './tags.js';
import {
  fetchAndCacheBlogData, getData, setData, getEncodeBase64
} from './data.js';
import { makeCreateIntersectionObserver, initializeVisibleComponents, handleDropdownChange } from './toys.js';
import {
  getElementById,
  getAudioElements,
  getElementsByTagName,
  hasClass,
  querySelector,
  removeControlsAttribute,
  createElement,
  createTextNode,
  stopDefault,
  playAudio,
  addEventListener,
  appendChild,
  insertBefore,
  log,
  warn,
  error,
  addWarning,
  getRandomNumber,
  getCurrentTime,
  setTextContent,
  disconnectObserver,
  isIntersecting,
  hide,
  pauseAudio,
  makeIntersectionObserver,
  addClass,
  getClasses,
  hasNextSiblingClass,
  removeNextSibling,
  removeChild,
  removeAllChildren,
  removeWarning,
  contains,
  enable,
} from './document.js';

function hasNoInteractiveComponents(win) {
  return !win.interactiveComponents || win.interactiveComponents.length === 0;
}

function getInteractiveComponentCount(win) {
  if (win.interactiveComponents) {
    return win.interactiveComponents.length;
  } else {
    return 0;
  }
}

function getInteractiveComponents(win) {
  return win.interactiveComponents || [];
}

function getComponentInitializer(getElement, logWarning, createIntersectionObserver) {
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


const globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {} // Holds data managed by toys like setTemporary
};

/**
 * @command
 * Imports a module dynamically with success and error handling
 * @param {string} modulePath - Path to the module to import
 * @param {Function} onSuccess - Function to call when import succeeds
 * @param {Function} onError - Function to call when import fails
 */
function importModule(modulePath, onSuccess, onError) {
  import(modulePath).then(onSuccess).catch(onError);
}

// createHandleClick has been moved to tags.js



/**
 * @query
 * Creates and returns a new environment map for dependency injection
 * @returns {Map<string, Function>} Map of environment functions
 */
const loggers = { logInfo: log, logError: error, logWarning: warn };

function createEnv() {
  return new Map([
    ["getRandomNumber", getRandomNumber],
    ["getCurrentTime", getCurrentTime],
    ["getData", () => getData(globalState, fetch, loggers)],
    ["setData", (newData) => setData({ desired: newData, current: globalState }, loggers)],
    ["encodeBase64", getEncodeBase64(btoa, unescape, encodeURIComponent)]
  ]);
}


const dom = {
  createElement,
  removeControlsAttribute,
  getAudioElements,
  setTextContent,
  stopDefault,
  addWarning,
  addEventListener,
  querySelector,
  disconnectObserver,
  isIntersecting,
  importModule,
  error,
  makeIntersectionObserver,
  addClass,
  appendChild,
  createTextNode,
  getElementsByTagName,
  getClasses,
  getRandomNumber,
  getCurrentTime,
  hasClass,
  hasNextSiblingClass,
  hide,
  insertBefore,
  log,
  pauseAudio,
  playAudio,
  removeControlsAttribute,
  removeNextSibling,
  enable,
  removeChild,
  removeWarning,
  contains,
  removeAllChildren
};
const env = { globalState, createEnv, error, fetch, loggers };

/**
 * Creates a basic number input element
 * @returns {HTMLInputElement} The created input element
 */
const createBaseNumberInput = () => {
  const input = dom.createElement('input');
  input.type = 'number';
  return input;
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
 * Creates a number input element with the specified value and change handler
 * @param {string} value - The initial value for the input
 * @param {Function} onChange - The callback to execute when the input value changes
 * @returns {HTMLInputElement} The created number input element
 */
const createNumberInput = (value, onChange) => {
  const input = createBaseNumberInput();
  if (value) {input.value = value;}
  setupInputEvents(input, onChange);
  return input;
};

/**
 * Positions the number input in the DOM relative to the text input
 * @param {HTMLElement} container - The container element
 * @param {HTMLInputElement} textInput - The text input element
 * @param {HTMLInputElement} numberInput - The number input element to position
 */
const positionNumberInput = (container, textInput, numberInput) => {
  if (textInput?.nextSibling) {
    container.insertBefore(numberInput, textInput.nextSibling);
  } else {
    container.appendChild(numberInput);
  }
};

/**
 * Ensures a single <input type="number"> exists just after the text input
 * @param {HTMLElement} container - The container element
 * @param {HTMLInputElement} textInput - The text input element
 * @returns {HTMLInputElement} The number input element
 */
const ensureNumberInput = (container, textInput) => {
  let numberInput = container.querySelector('input[type="number"]');

  if (!numberInput) {
    const onValueChange = e => {
      if (textInput) {textInput.value = e.target.value;}
    };

    numberInput = createNumberInput(textInput?.value, onValueChange);
    positionNumberInput(container, textInput, numberInput);
  }

  return numberInput;
};

// Ensures a dynamic key/value editor exists just after the given hidden text input.
// - `container`  : <div class="value"> wrapper
// - `textInput`  : hidden <input type="text"> that stores a JSON string
//
// Internal state: `rows` = [{key, value}]. The editor writes to the hidden field
// on every change so that a normal form submission works out‑of‑the‑box.
//
// Memory‑safety: **every** DOM listener is registered explicitly, its disposer is
// stored in `disposers`, and cleared on every re‑render or when `_dispose()`
// runs, preventing leaks.
const ensureKeyValueInput = (container, textInput) => {
  // Re‑use an existing editor if one is already present
  let kvContainer = container.querySelector('.kv-container');
  if (!kvContainer) {
    kvContainer = dom.createElement('div');
    kvContainer.className = 'kv-container';

    // Insert right after the reference text input for a predictable layout
    if (textInput?.nextSibling) {
      container.insertBefore(kvContainer, textInput.nextSibling);
    } else {
      container.appendChild(kvContainer);
    }
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

  const syncHiddenField = (textInput, rows) => {
    if (!textInput) {return;}
    // Only include keys with non-empty key or value
    const filtered = {};
    for (const [k, v] of Object.entries(rows)) {
      if (k || v) {filtered[k] = v;}
    }
    textInput.value = JSON.stringify(filtered);
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
      rowEl.className = 'kv-row';

      // Key field
      const keyEl = dom.createElement('input');
      keyEl.type = 'text';
      keyEl.placeholder = 'Key';
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


const createIntersectionObserver = makeCreateIntersectionObserver(dom, env);


// isIntersecting and disconnectObserver moved to document.js

// Interactive components functionality


initializeVisibleComponents(
  {
    win: window,
    logInfo: log,
    logWarning: warn,
    getElement: getElementById,
    hasNoInteractiveComponents,
    getInteractiveComponents,
    getInteractiveComponentCount,
    getComponentInitializer
  },
  createIntersectionObserver
);

// Tag filtering functionality

handleTagLinks(dom);

// Initial fetch of blog data when the script loads
fetchAndCacheBlogData(globalState, fetch, { logInfo: log, logError: error });

setupAudio(dom);

// Add event listeners to toy output dropdowns

const onOutputDropdownChange = event => handleDropdownChange(
  event.currentTarget,
  () => getData(globalState, fetch, loggers),
  dom
);

const onInputDropdownChange = event => {
  const select = event.currentTarget;
  const container = select.parentElement; // <div class="value">
  const textInput = container.querySelector('input[type="text"]');

  if (textInput) {
    const showText = select.value === 'text';
    textInput.hidden = !showText;
    textInput.disabled = !showText;
  }

  const maybeRemoveNumber = () => {
    const numberInput = container.querySelector('input[type="number"]');
    if (numberInput) {
      numberInput._dispose?.();
      container.removeChild(numberInput);
    }
  };

  const maybeRemoveKV = () => {
    const kvContainer = container.querySelector('.kv-container');
    if (kvContainer) {
      kvContainer._dispose?.();
      container.removeChild(kvContainer);
    }
  };

  if (select.value === 'number') {
    maybeRemoveKV();
    ensureNumberInput(container, textInput);
  } else if (select.value === 'kv') {
    maybeRemoveNumber();
    ensureKeyValueInput(container, textInput);
  } else {
    // 'text' or any other type – clean up specialised inputs
    maybeRemoveNumber();
    maybeRemoveKV();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  const outputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.output'));
  outputDropdowns.forEach(dropdown => {
    dropdown.addEventListener('change', onOutputDropdownChange);
  });

  // Add event listeners to toy input dropdowns
  const inputDropdowns = Array.from(document.querySelectorAll('article.entry .value > select.input'));
  inputDropdowns.forEach(dropdown => {
    dropdown.addEventListener('change', onInputDropdownChange);
  });
});