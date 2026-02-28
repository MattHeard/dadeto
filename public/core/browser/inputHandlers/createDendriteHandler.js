import * as browserCore from '../browser-core.js';

/** @typedef {import('../browser-core.js').DOMEventListener} DOMEventListener */
/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {Record<string, string>} DendriteData */
/** @typedef {() => void} Disposer */

/**
 * Call a node's _dispose method when available.
 * @param {HTMLElement & { _dispose?: Disposer }} node - Node to clean up.
 * @returns {void}
 */
export function disposeIfPossible(node) {
  const disposer = node._dispose;
  if (typeof disposer === 'function') {
    disposer();
  }
}

/**
 * Remove any previously rendered dendrite form from the container.
 * @param {HTMLElement} container - Wrapper element.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {void}
 */
export function removeExistingForm(container, dom) {
  const existing = dom.querySelector(
    container,
    browserCore.DENDRITE_FORM_SELECTOR
  );
  if (existing) {
    disposeIfPossible(existing);
    dom.removeChild(container, existing);
  }
}

/**
 *
 * @param dom
 * @param textInput
 */
/**
 * Parse JSON data stored in the hidden text input.
 * @param {DOMHelpers} dom - DOM utilities.
 * @param {HTMLInputElement} textInput - Hidden input element.
 * @returns {DendriteData} Parsed dendrite data.
 */
function parseDendriteData(dom, textInput) {
  const value = browserCore.getInputValue(textInput) || '{}';
  return /** @type {DendriteData} */ (
    browserCore.parseJsonOrDefault(value, {})
  );
}

/**
 *
 * @param dom
 */
/**
 * Build a dom element creation helper for this dom helper bucket.
 * @param {DOMHelpers} dom - DOM utilities.
 * @returns {(tag: string) => HTMLElement} Factory that creates DOM nodes.
 */
function createElementFactory(dom) {
  return tag => dom.createElement(tag);
}

/**
 * Build the wrapper container and label used for field rendering.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {{fieldWrapper: HTMLElement, label: HTMLElement}} Elements for the field.
 */
function createFieldWrapper(dom) {
  const createElement = createElementFactory(dom);
  const tagNames = ['div', 'label'];
  const [fieldWrapper, label] = tagNames.map(createElement);
  return { fieldWrapper, label };
}

/**
 * Create an input element for a given field key.
 * @param {DOMHelpers} dom - DOM utilities.
 * @param {string} key - Field name.
 * @returns {HTMLInputElement | HTMLTextAreaElement} The created element.
 */
function createInputElement(dom, key) {
  const createElement = createElementFactory(dom);
  if (key === 'content') {
    return /** @type {HTMLTextAreaElement} */ (createElement('textarea'));
  }
  const element = /** @type {HTMLInputElement} */ (createElement('input'));
  dom.setType(element, 'text');
  return element;
}

/**
 * Set an input's value from the data object when the key exists.
 * @param {{dom: DOMHelpers, input: HTMLInputElement | HTMLTextAreaElement, data: DendriteData, key: string}} options - Configuration for the helper.
 * @returns {void}
 */
function setInputValueFromData({ dom, input, data, key }) {
  if (Object.prototype.hasOwnProperty.call(data, key)) {
    dom.setValue(input, data[key]);
  }
}

/**
 * Build a factory that sets DOM input values for this dom helper bucket.
 * @param {DOMHelpers} dom - DOM utilities.
 * @returns {(input: HTMLInputElement, value: string) => void} Setter helper.
 */
function createSetValueFactory(dom) {
  return (textInput, serialised) => dom.setValue(textInput, serialised);
}

/**
 * Serialize the user data and mirror it in the hidden JSON input.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {HTMLInputElement} textInput - Hidden input element.
 * @param {Record<string, unknown>} data - Current payload snapshot.
 */
export function syncHiddenInput(dom, textInput, data) {
  const serialised = JSON.stringify(data);
  const setValue = createSetValueFactory(dom);
  const syncFns = [setValue, browserCore.setInputValue];
  const executeSyncFn = createExecuteSyncFn(textInput, serialised);
  syncFns.forEach(executeSyncFn);
}

/**
 * Create a helper to execute sync functions with the shared args.
 * @param {HTMLInputElement} textInput - Hidden JSON input.
 * @param {string} serialised - Serialized data payload.
 * @returns {(fn: Function) => void} Executor for sync functions.
 */
function createExecuteSyncFn(textInput, serialised) {
  return fn => fn(textInput, serialised);
}

/**
 * Create a closure for responding to user input on a field.
 * @param {{dom: DOMHelpers, key: string, input: HTMLInputElement | HTMLTextAreaElement, textInput: HTMLInputElement, data: DendriteData}} options - Handler configuration.
 * @returns {() => void} Event handler that keeps the payload in sync.
 */
function createFieldInputHandler({ dom, key, input, textInput, data }) {
  return () => {
    data[key] = String(dom.getValue(input));
    syncHiddenInput(dom, textInput, data);
  };
}

/**
 * Build a disposer that removes the last registered input listener.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {HTMLInputElement | HTMLTextAreaElement} input - Input element to clean up.
 * @param {DOMEventListener} handler - Handler previously registered.
 * @returns {() => void} Disposer that removes the listener.
 */
function createInputListenerDisposer(dom, input, handler) {
  return () => dom.removeEventListener(input, 'input', handler);
}

/**
 * Register an input listener and capture its disposer.
 * @param {{ dom: DOMHelpers, input: HTMLInputElement | HTMLTextAreaElement | HTMLElement, handler: DOMEventListener, disposers: Disposer[] }} options - Listener registration dependencies.
 * @returns {void}
 */
export function registerInputListener({ dom, input, handler, disposers }) {
  dom.addEventListener(input, 'input', handler);
  const inputDisposer = createInputListenerDisposer(dom, input, handler);
  disposers.push(inputDisposer);
}

/**
 * Create an appender for a specific wrapper element.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {HTMLElement} wrapper - Container to append into.
 * @returns {(child: HTMLElement) => void} Appender function that keeps the wrapper fixed.
 */
function createWrapperAppender(dom, wrapper) {
  return child => dom.appendChild(wrapper, child);
}

/**
 * Build a labelled wrapper div and append it to the form.
 * @param {{ dom: DOMHelpers, form: HTMLElement, labelText: string, input: HTMLElement }} options - Label and field to append.
 * @returns {void}
 */
export function appendLabelledField({ dom, form, labelText, input }) {
  const { fieldWrapper, label } = createFieldWrapper(dom);
  dom.setTextContent(label, labelText);
  const appendToWrapper = createWrapperAppender(dom, fieldWrapper);
  [label, input].forEach(appendToWrapper);
  dom.appendChild(form, fieldWrapper);
}

/**
 * Build and wire up an input element for a field.
 * @param {{dom: DOMHelpers, key: string, placeholder: string, data: DendriteData, textInput: HTMLInputElement, disposers: Disposer[]}} options - Input setup parameters.
 * @returns {HTMLInputElement | HTMLTextAreaElement} Initialized input element.
 */
function createFieldInput(options) {
  const { dom, key, placeholder, data, textInput, disposers } = options;
  const input = createInputElement(dom, key);
  dom.setPlaceholder(input, placeholder);
  setInputValueFromData({ dom, input, data, key });
  const onInput = createFieldInputHandler({
    dom,
    key,
    input,
    textInput,
    data,
  });
  registerInputListener({ dom, input, handler: onInput, disposers });
  return input;
}

/**
 * Create the wrapper, label, and input elements for a field and append them.
 * @param {{dom: DOMHelpers, key: string, placeholder: string, data: DendriteData, textInput: HTMLInputElement, disposers: Disposer[]}} options - Field render inputs.
 * @returns {{fieldWrapper: HTMLElement}} Wrapped elements ready for insertion.
 */
function createFieldElements(options) {
  const { dom, placeholder } = options;
  const { fieldWrapper, label } = createFieldWrapper(dom);
  dom.setTextContent(label, placeholder);

  const input = createFieldInput(options);
  const appendToWrapper = createWrapperAppender(dom, fieldWrapper);
  [label, input].forEach(appendToWrapper);

  return { fieldWrapper };
}

/**
 * Render a single field inside a form.
 * @param {{dom: DOMHelpers, form: HTMLElement, key: string, placeholder: string, data: DendriteData, textInput: HTMLInputElement, disposers: Disposer[]}} options - Field render options.
 * @returns {void}
 */
function buildField({
  dom,
  form,
  key,
  placeholder,
  data,
  textInput,
  disposers,
}) {
  const sharedArgs = getSharedFormArgs({ data, textInput, disposers });
  const { fieldWrapper } = createFieldElements({
    dom,
    key,
    placeholder,
    ...sharedArgs,
  });
  dom.appendChild(form, fieldWrapper);
}

/**
 * Build a renderer for the field definitions list.
 * @param {{dom: DOMHelpers, form: HTMLElement, data: DendriteData, textInput: HTMLInputElement, disposers: Disposer[]}} options - Rendering helpers.
 * @returns {(field: [string, string]) => void} Renderer for each field tuple.
 */
function createFieldRenderer({ dom, form, data, textInput, disposers }) {
  const sharedArgs = getSharedFormArgs({ data, textInput, disposers });
  return function renderFieldForTuple([key, placeholder]) {
    buildField({
      dom,
      form,
      key,
      placeholder,
      ...sharedArgs,
    });
  };
}

/**
 * Invoke a disposer function.
 * @param {Function} fn - Disposer to invoke.
 * @returns {void}
 */
function runDisposer(fn) {
  fn();
}

/**
 * Build a disposer that runs over the registered disposers array.
 * @param {Disposer[]} disposers - Disposer functions to invoke.
 * @returns {() => void} Form-level dispose handler.
 */
function createDisposeForm(disposers) {
  return () => {
    disposers.forEach(runDisposer);
  };
}

/**
 * Create and insert the shared dendrite-style form shell.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement, disposers: Disposer[] }} options - Form shell dependencies.
 * @returns {HTMLElement & { _dispose?: Disposer }} Inserted form shell.
 */
export function createManagedFormShell({
  dom,
  container,
  textInput,
  disposers,
}) {
  const dendriteFormClassName = browserCore.DENDRITE_FORM_SELECTOR.slice(1);
  const form = /** @type {HTMLElement & { _dispose?: Disposer }} */ (
    dom.createElement('div')
  );
  dom.setClassName(form, dendriteFormClassName);
  const nextSibling = dom.getNextSibling(textInput);
  dom.insertBefore(container, form, nextSibling);
  form._dispose = createDisposeForm(disposers);
  return form;
}

/**
 * Capture the arguments shared between field renderers and form builders.
 * @param {{data: DendriteData, textInput: HTMLInputElement, disposers: Disposer[]}} options - Sync helpers for the form data.
 * @returns {{data: DendriteData, textInput: HTMLInputElement, disposers: Disposer[]}} Shared payload.
 */
function getSharedFormArgs({ data, textInput, disposers }) {
  return { data, textInput, disposers };
}

/**
 * Invoke a remover helper with the shared container/dom args.
 * @param {Function} fn - Remover function to execute.
 * @param {HTMLElement} container - Container element to clean up.
 * @param {DOMHelpers} dom - DOM helpers.
 * @returns {void}
 */
function runRemover(fn, container, dom) {
  fn(container, dom);
}

/**
 * Run a remover helper bound to a specific container and DOM utilities.
 * @param {HTMLElement} container - Container element.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {Function} remover - Remover helper to invoke.
 * @returns {void}
 */
function runRemoverForContainer(container, dom, remover) {
  runRemover(remover, container, dom);
}

/**
 * Run a list of remover helpers against the current container.
 * @param {HTMLElement} container - Container element to clean up.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {Function[]} removers - Cleanup helpers to execute.
 * @returns {void}
 */
export function runContainerRemovers(container, dom, removers) {
  const runForContainer = runRemoverForContainer.bind(null, container, dom);
  removers.forEach(runForContainer);
}

/**
 * Remove existing inputs and forms from the container.
 * @param {DOMHelpers} dom - DOM utilities.
 * @param {HTMLElement} container - Container element.
 * @returns {void}
 */
export function cleanContainer(dom, container) {
  const removers = [
    browserCore.maybeRemoveNumber,
    browserCore.maybeRemoveKV,
    browserCore.maybeRemoveTextarea,
    removeExistingForm,
  ];
  runContainerRemovers(container, dom, removers);
}

/**
 * Create the buildForm implementation bound to a set of fields.
 * @param {Array<[string, string]>} fields - Field definitions to render.
 * @returns {(dom: DOMHelpers, options: {container: HTMLElement, textInput: HTMLInputElement, data: DendriteData, disposers: Disposer[]}) => HTMLElement} Form builder bound to `fields`.
 */
function createBuildForm(fields) {
  return function buildForm(dom, { container, textInput, data, disposers }) {
    const form = createManagedFormShell({
      dom,
      container,
      textInput,
      disposers,
    });

    const renderField = createFieldRenderer({
      dom,
      form,
      data,
      textInput,
      disposers,
    });
    fields.forEach(renderField);

    syncHiddenInput(dom, textInput, data);

    return form;
  };
}

/**
 * Create and insert a dendrite form for editing data.
 * @param {{buildForm: Function, dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement}} options - Form creation inputs.
 * @returns {HTMLElement} Newly created form.
 */
function createDendriteForm({ buildForm, dom, container, textInput }) {
  /** @type {Disposer[]} */
  const disposers = [];
  const data = parseDendriteData(dom, textInput);
  const sharedArgs = getSharedFormArgs({ data, textInput, disposers });
  return buildForm(dom, { container, ...sharedArgs });
}

/**
 * Create a handler for rendering and managing a dendrite form.
 * @param {Array<[string, string]>} fields - Field definitions to render.
 * @returns {(dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement) => HTMLElement} Generated handler function.
 */
export function createDendriteHandler(fields) {
  return function dendriteHandler(dom, container, textInput) {
    const buildForm = createBuildForm(fields);
    browserCore.hideAndDisable(textInput, dom);
    cleanContainer(dom, container);
    return createDendriteForm({ buildForm, dom, container, textInput });
  };
}
