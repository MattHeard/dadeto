import * as browserCore from '../browser-core.js';
import {
  createInputDisposer,
  revealAndEnable,
} from './browserInputHandlersCore.js';
import { createSpecialInputEnsurer } from './sharedSpecialInput.js';

/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */

const FILE_INPUT_SELECTOR = 'input[type="file"]';
const FILE_INPUT_CLASS = 'toy-file-input';
const FILE_INPUT_ACCEPT = '.csv,text/csv,text/plain';

/**
 * Create a file input element for uploading CSV text.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @returns {HTMLInputElement} File input element.
 */
function createFileInputElement(dom) {
  const fileInput = /** @type {HTMLInputElement} */ (
    dom.createElement('input')
  );
  dom.setType(fileInput, 'file');
  dom.setClassName(fileInput, FILE_INPUT_CLASS);
  fileInput.accept = FILE_INPUT_ACCEPT;
  return fileInput;
}

/**
 * Sync the hidden text input with uploaded file contents.
 * @param {HTMLInputElement} textInput Hidden input field.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @param {string} content Uploaded file text.
 * @returns {void}
 */
function syncTextInput(textInput, dom, content) {
  dom.setValue(textInput, content);
  browserCore.setInputValue(textInput, content);
}

/**
 * Read the text contents of the first selected file.
 * @param {HTMLInputElement} fileInput File upload control.
 * @returns {Promise<string | null>} Uploaded contents or null when no file is selected.
 */
function readSelectedFileText(fileInput) {
  const file = fileInput.files[0];
  if (!file) {
    return Promise.resolve(null);
  }

  return file.text();
}

/**
 * Sync uploaded content when a file is selected.
 * @param {HTMLInputElement} textInput Hidden input field.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @param {string | null} content Uploaded file text.
 * @returns {void}
 */
function syncSelectedFileText(textInput, dom, content) {
  if (content === null) {
    return;
  }

  syncTextInput(textInput, dom, content);
}

/**
 * Create a change handler that loads CSV file contents into the hidden text input.
 * @param {{ dom: DOMHelpers, textInput: HTMLInputElement }} options Wiring dependencies.
 * @returns {(event: Event) => Promise<void>} Change handler.
 */
function createFileChangeHandler({ dom, textInput }) {
  return event => {
    const fileInput = /** @type {HTMLInputElement} */ (
      dom.getCurrentTarget(event)
    );
    return readSelectedFileText(fileInput).then(content =>
      syncSelectedFileText(textInput, dom, content)
    );
  };
}

/**
 * Ensure the file input exists and is wired to the hidden text input.
 * @param {HTMLElement} container Container element.
 * @param {HTMLInputElement} textInput Hidden text input.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @returns {HTMLInputElement} File input element.
 */
export const ensureFileInput = (container, textInput, dom) => {
  const { ensure } = createSpecialInputEnsurer({
    selector: FILE_INPUT_SELECTOR,
    container,
    textInput,
    dom,
  });

  const fileInput = /** @type {HTMLInputElement} */ (
    ensure(() => {
      const input = createFileInputElement(dom);
      const handleChange = createFileChangeHandler({ dom, textInput });
      dom.addEventListener(input, 'change', handleChange);
      input._dispose = createInputDisposer(dom, input, handleChange);
      return input;
    })
  );

  dom.setClassName(fileInput, FILE_INPUT_CLASS);
  fileInput.accept = FILE_INPUT_ACCEPT;
  revealAndEnable(fileInput, dom);
  return fileInput;
};

/**
 * Switch the UI to a file upload input for CSV imports.
 * @param {DOMHelpers} dom DOM helper utilities.
 * @param {HTMLElement} container Container holding the toy inputs.
 * @param {HTMLInputElement} textInput Hidden text input element.
 * @returns {void}
 */
export function fileHandler(dom, container, textInput) {
  browserCore.hideAndDisable(textInput, dom);
  browserCore.applyBaseCleanupHandlers({ container, dom });
  ensureFileInput(container, textInput, dom);
}
