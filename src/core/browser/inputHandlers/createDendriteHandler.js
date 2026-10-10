import * as browserCore from '../browserUtilities.js';
import { removeExistingSpecialInput } from './browserInputHandlersCore.js';

/** @typedef {import('../browser-core.js').DOMEventListener} DOMEventListener */
/** @typedef {import('../domHelpers.js').DOMHelpers} DOMHelpers */
/** @typedef {Record<string, string>} DendriteData */
/** @typedef {() => void} Disposer */
/** @typedef {(container: HTMLElement, dom: DOMHelpers) => void} Remover */

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
  removeExistingSpecialInput(
    container,
    dom,
    browserCore.DENDRITE_FORM_SELECTOR,
    disposeIfPossible
  );
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
  const value = browserCore.getInputValue(textInput);
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
  const fieldWrapper = createElement('div');
  const label = createElement('label');
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
 * Apply a form mutation and mirror the result into its hidden payload input.
 * @param {DOMHelpers} dom DOM helper facade.
 * @param {HTMLInputElement} textInput Hidden payload input.
 * @param {Record<string, unknown>} data Mutable form data.
 * @param {() => void} applyMutation Field update.
 * @returns {void}
 */
export function applyMutationAndSyncHiddenInput(
  dom,
  textInput,
  data,
  applyMutation
) {
  applyMutation();
  syncHiddenInput(dom, textInput, data);
}

/**
 * Sync a managed form's hidden payload and return the form.
 * @param {{
 *   dom: DOMHelpers,
 *   textInput: HTMLInputElement,
 *   data: Record<string, unknown>,
 *   form: HTMLElement,
 * }} options Managed form state.
 * @returns {HTMLElement} The form passed in.
 */
export function finalizeManagedForm({ dom, textInput, data, form }) {
  syncHiddenInput(dom, textInput, data);
  return form;
}

/**
 * Build and finalize a managed form in one step.
 * @param {{
 *   dom: DOMHelpers,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 * }} options Form setup dependencies.
 * @param {(shell: { form: HTMLElement, disposers: Disposer[] }) => { data: Record<string, unknown>, form: HTMLElement } | HTMLElement} buildFormContent Form body callback.
 * @returns {HTMLElement} Finalized form element.
 */
export function buildManagedForm(options, buildFormContent) {
  return /** @type {HTMLElement} */ (
    withManagedFormShell(options, shell => {
      const result = buildFormContent(shell);
      if (
        result &&
        typeof result === 'object' &&
        'data' in result &&
        'form' in result
      ) {
        return finalizeManagedForm({
          dom: options.dom,
          textInput: options.textInput,
          data: /** @type {Record<string, unknown>} */ (result.data),
          form: /** @type {HTMLElement} */ (result.form),
        });
      }

      return /** @type {HTMLElement} */ (result);
    })
  );
}

/**
 * Create a helper to execute sync functions with the shared args.
 * @param {HTMLInputElement} textInput - Hidden JSON input.
 * @param {string} serialised - Serialized data payload.
 * @returns {(fn: (textInput: HTMLInputElement, serialised: string) => void) => void} Executor for sync functions.
 */
function createExecuteSyncFn(textInput, serialised) {
  return fn => fn(textInput, serialised);
}

/**
 * Create a closure for responding to user input on a field.
 * @param {{dom: DOMHelpers, key: string, input: HTMLInputElement | HTMLTextAreaElement, textInput: HTMLInputElement, data: DendriteData}} options - Handler configuration.
 * @returns {() => void} Event handler that keeps the payload in sync.
 */
function createFieldInputHandler(options) {
  return () => {
    options.data[options.key] = String(options.dom.getValue(options.input));
    syncHiddenInput(options.dom, options.textInput, options.data);
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
 * @param {{ dom: DOMHelpers, input: HTMLInputElement | HTMLTextAreaElement, handler: DOMEventListener, disposers: Disposer[] }} options - Listener registration dependencies.
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
 * Append the label/input pair into a wrapper and then insert that wrapper into the form.
 * @param {DOMHelpers} dom DOM helpers.
 * @param {HTMLElement} form Form receiving the wrapper.
 * @param {HTMLElement} fieldWrapper Wrapper receiving its label and input.
 * @returns {(label: HTMLElement, input: HTMLElement) => void} Inserter for the completed field.
 */
function appendWrappedField(dom, form, fieldWrapper) {
  return function appendFieldChildren(label, input) {
    const appendToWrapper = createWrapperAppender(dom, fieldWrapper);
    [label, input].forEach(appendToWrapper);
    dom.appendChild(form, fieldWrapper);
  };
}

/**
 * Create and append one labelled input field.
 * @param {DOMHelpers} dom DOM helpers.
 * @param {HTMLElement} form Form receiving the field.
 * @param {string} labelText Visible label text.
 * @param {HTMLInputElement | HTMLTextAreaElement | (() => HTMLInputElement | HTMLTextAreaElement)} fieldInput Input element or deferred input creator.
 * @returns {void}
 */
function appendFieldParts(dom, form, labelText, fieldInput) {
  const { fieldWrapper, label } = createFieldWrapper(dom);
  dom.setTextContent(label, labelText);
  /** @type {HTMLInputElement | HTMLTextAreaElement} */
  const input = typeof fieldInput === 'function' ? fieldInput() : fieldInput;
  appendWrappedField(dom, form, fieldWrapper)(label, input);
}

export const appendLabelledField = appendFieldParts;

/**
 * Register an input listener and append the input as a labelled field.
 * @param {DOMHelpers} dom DOM helpers.
 * @param {HTMLElement} form Form receiving the field.
 * @param {HTMLInputElement | HTMLTextAreaElement} input Field input.
 * @param {DOMEventListener} handler Input event handler.
 * @returns {(labelText: string, disposers: Disposer[]) => void} Final label and listener wiring step.
 */
export function wireLabelledField(dom, form, input, handler) {
  return function finishFieldWiring(labelText, disposers) {
    registerInputListener({ dom, input, handler, disposers });
    return appendFieldParts(dom, form, labelText, input);
  };
}

/**
 * Build and wire up an input element for a field.
 * @param {DOMHelpers} dom DOM helpers.
 * @param {string} key Field key.
 * @param {string} placeholder Input placeholder.
 * @param {{data: DendriteData, textInput: HTMLInputElement, disposers: Disposer[]}} sharedArgs Form state shared by input fields.
 * @returns {HTMLInputElement | HTMLTextAreaElement} Initialized input element.
 */
function createFieldInput(dom, key, placeholder, sharedArgs) {
  const input = createInputElement(dom, key);
  dom.setPlaceholder(input, placeholder);
  setInputValueFromData({ dom, input, data: sharedArgs.data, key });
  const onInput = createFieldInputHandler({
    dom,
    key,
    input,
    textInput: sharedArgs.textInput,
    data: sharedArgs.data,
  });
  registerInputListener({
    dom,
    input,
    handler: onInput,
    disposers: sharedArgs.disposers,
  });
  return input;
}

/**
 * Build a renderer for field definitions using shared form state.
 * @param {DOMHelpers} dom DOM helpers.
 * @param {HTMLElement} form Form receiving fields.
 * @param {{data: DendriteData, textInput: HTMLInputElement, disposers: Disposer[]}} sharedArgs State shared by rendered fields.
 * @returns {(field: [string, string]) => void} Renderer for each field tuple.
 */
function createFieldRenderer(dom, form, sharedArgs) {
  return function renderFieldForTuple([key, placeholder]) {
    appendFieldParts(dom, form, placeholder, () =>
      createFieldInput(dom, key, placeholder, sharedArgs)
    );
  };
}

/**
 * Invoke a disposer function.
 * @param {DOMHelpers} dom - Shared DOM helper facade.
 * @param {Disposer} fn - Disposer to invoke.
 * @returns {void}
 */
function runDisposer(dom, fn) {
  fn();
}

/**
 * Build a disposer that runs over the registered disposers array.
 * @param {DOMHelpers} dom - Shared DOM helper facade.
 * @param {Disposer[]} disposers - Disposer functions to invoke.
 * @returns {() => void} Form-level dispose handler.
 */
function createDisposeForm(dom, disposers) {
  return () => {
    disposers.forEach(fn => runDisposer(dom, fn));
  };
}

/**
 * Create and insert the shared dendrite-style form shell.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement, disposers: Disposer[] }} options - Form shell dependencies.
 * @returns {HTMLElement & { _dispose?: Disposer }} Inserted form shell.
 */
export function createManagedFormShell(options) {
  const { dom, container, textInput, disposers } = options;
  const dendriteFormClassName = browserCore.DENDRITE_FORM_SELECTOR.slice(1);
  const form = /** @type {HTMLElement & { _dispose?: Disposer }} */ (
    dom.createElement('div')
  );
  dom.setClassName(form, dendriteFormClassName);
  const nextSibling = dom.getNextSibling(textInput);
  dom.insertBefore(container, form, nextSibling);
  form._dispose = createDisposeForm(dom, disposers);
  return form;
}

/**
 * Create a managed form shell with its cleanup stack.
 * @param {{ dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement, disposers?: Disposer[] }} options - Form setup dependencies.
 * @returns {{ form: HTMLElement, disposers: Disposer[] }} Managed form shell and cleanup stack.
 */
export function createManagedFormShellState(options) {
  const disposers = options.disposers || /** @type {Disposer[]} */ ([]);
  const form = createManagedFormShell({ ...options, disposers });
  return { form, disposers };
}

/**
 * Run a callback against a managed form shell.
 * @param {{
 *   dom: DOMHelpers,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 * }} options Form setup dependencies.
 * @param {(shell: { form: HTMLElement, disposers: Disposer[] }) => unknown} useShell Shell callback.
 * @returns {unknown} Result returned by the callback.
 */
export function withManagedFormShell(options, useShell) {
  return useShell(createManagedFormShellState(options));
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
 * @param {Remover} fn - Remover function to execute.
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
 * @param {Remover} remover - Remover helper to invoke.
 * @returns {void}
 */
function runRemoverForContainer(container, dom, remover) {
  runRemover(remover, container, dom);
}

/**
 * Run a list of remover helpers against the current container.
 * @param {HTMLElement} container - Container element to clean up.
 * @param {DOMHelpers} dom - DOM helpers.
 * @param {Remover[]} removers - Cleanup helpers to execute.
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
  const removers = browserCore.createInputCleanupHandlers([removeExistingForm]);
  runContainerRemovers(container, dom, removers);
}

/**
 * Hide the text input, clean the container, and then build a form.
 * @param {{
 *   dom: DOMHelpers,
 *   container: HTMLElement,
 *   textInput: HTMLInputElement,
 *   buildForm: (options: { dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement }) => HTMLElement,
 * }} options - Form handler dependencies.
 * @returns {HTMLElement} The created form element.
 */
export function runFormHandler({ dom, container, textInput, buildForm }) {
  browserCore.hideAndDisable(textInput, dom);
  cleanContainer(dom, container);
  const options = { dom, container, textInput };
  return buildForm(options);
}

/**
 * Create the buildForm implementation bound to a set of fields.
 * @param {Array<[string, string]>} fields - Field definitions to render.
 * @returns {(dom: DOMHelpers) => (options: {container: HTMLElement, textInput: HTMLInputElement, data: DendriteData, disposers: Disposer[]}) => HTMLElement} Form builder bound to `fields` and then to DOM helpers.
 */
function createBuildForm(fields) {
  return function bindFormDom(dom) {
    return function buildForm({ container, textInput, data, disposers }) {
      const { form } = createManagedFormShellState({
        dom,
        container,
        textInput,
        disposers,
      });

      const renderField = createFieldRenderer(
        dom,
        form,
        getSharedFormArgs({ data, textInput, disposers })
      );
      fields.forEach(renderField);
      return finalizeManagedForm({ dom, textInput, data, form });
    };
  };
}

/**
 * Create and insert a dendrite form for editing data.
 * @param {{buildForm: (dom: DOMHelpers) => (options: { container: HTMLElement, textInput: HTMLInputElement, data: DendriteData, disposers: Disposer[] }) => HTMLElement, dom: DOMHelpers, container: HTMLElement, textInput: HTMLInputElement}} options - Form creation inputs.
 * @returns {HTMLElement} Newly created form.
 */
function createDendriteForm({ buildForm, dom, container, textInput }) {
  /** @type {Disposer[]} */
  const disposers = [];
  const data = parseDendriteData(dom, textInput);
  const sharedArgs = getSharedFormArgs({ data, textInput, disposers });
  return buildForm(dom)({ container, ...sharedArgs });
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
