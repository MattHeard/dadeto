import { DENDRITE_FORM_SELECTOR } from '../../constants/selectors.js';
import { parseJsonOrDefault } from '../../jsonUtils.js';
import {
  maybeRemoveNumber,
  maybeRemoveKV,
  maybeRemoveTextarea,
} from './removeElements.js';
import { hideAndDisable } from './inputState.js';
import { getInputValue, setInputValue } from '../inputValueStore.js';

/**
 * Call a node's _dispose method when available.
 * @param {{_dispose?: Function}} node - Node to clean up.
 * @returns {void}
 */
function disposeIfPossible(node) {
  const disposer = node._dispose;
  if (typeof disposer === 'function') {
    disposer();
  }
}

/**
 * Remove any previously rendered dendrite form from the container.
 * @param {HTMLElement} container - Wrapper element.
 * @param {object} dom - DOM helpers.
 * @returns {void}
 */
function removeExistingForm(container, dom) {
  const existing = dom.querySelector(container, DENDRITE_FORM_SELECTOR);
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
 * @param {object} dom - DOM utilities.
 * @param {HTMLInputElement} textInput - Hidden input element.
 * @returns {object} Parsed dendrite data.
 */
function parseDendriteData(dom, textInput) {
  const value = getInputValue(textInput) || '{}';
  return parseJsonOrDefault(value, {});
}

/**
 *
 * @param dom
 */
/**
 * Build a dom element creation helper for this dom helper bucket.
 * @param {object} dom - DOM utilities.
 * @returns {(tag: string) => HTMLElement} Factory that creates DOM nodes.
 */
function createElementFactory(dom) {
  return tag => dom.createElement(tag);
}

/**
 *
 * @param dom
 * @param key
 */
/**
 * Create an input element for a given field key.
 * @param {object} dom - DOM utilities.
 * @param {string} key - Field name.
 * @returns {HTMLElement} The created element.
 */
function createInputElement(dom, key) {
  const createElement = createElementFactory(dom);
  if (key === 'content') {
    return createElement('textarea');
  }
  const element = createElement('input');
  dom.setType(element, 'text');
  return element;
}

/**
 * Build a factory that sets DOM input values for this dom helper bucket.
 * @param {object} dom - DOM utilities.
 * @returns {(input: HTMLInputElement, value: string) => void} Setter helper.
 */
function createSetValueFactory(dom) {
  return (textInput, serialised) => dom.setValue(textInput, serialised);
}

/**
 * Serialize the user data and mirror it in the hidden JSON input.
 * @param {object} dom - DOM helpers.
 * @param {HTMLInputElement} textInput - Hidden input element.
 * @param {object} data - Current payload snapshot.
 */
function syncHiddenInput(dom, textInput, data) {
  const serialised = JSON.stringify(data);
  const setValue = createSetValueFactory(dom);
  const syncFns = [setValue, setInputValue];
  syncFns.forEach(fn => fn(textInput, serialised));
}

/**
 * Create a closure for responding to user input on a field.
 * @param {{dom: object, key: string, input: HTMLElement, textInput: HTMLInputElement, data: object}} options - Handler configuration.
 * @returns {() => void} Event handler that keeps the payload in sync.
 */
function createFieldInputHandler({ dom, key, input, textInput, data }) {
  return () => {
    data[key] = dom.getValue(input);
    syncHiddenInput(dom, textInput, data);
  };
}

/**
 * Build a disposer that removes the last registered input listener.
 * @param {object} dom - DOM helpers.
 * @param {HTMLElement} input - Input element to clean up.
 * @param {Function} handler - Handler previously registered.
 * @returns {() => void} Disposer that removes the listener.
 */
function createInputListenerDisposer(dom, input, handler) {
  return () => dom.removeEventListener(input, 'input', handler);
}

/**
 * Create an appender for a specific wrapper element.
 * @param {object} dom - DOM helpers.
 * @param {HTMLElement} wrapper - Container to append into.
 * @returns {(child: HTMLElement) => void} Appender function that keeps the wrapper fixed.
 */
function createWrapperAppender(dom, wrapper) {
  return child => dom.appendChild(wrapper, child);
}

/**
 * Add a labeled input field to the dendrite form.
 * @param {object} dom - DOM helpers.
 * @param {HTMLElement} form - Form container.
 * @param {{key: string, placeholder: string, data: object, textInput: HTMLInputElement, disposers: Function[]}} options - Field options.
 * @returns {void}
 */
function createField(
  dom,
  form,
  { key, placeholder, data, textInput, disposers }
) {
  const createElement = createElementFactory(dom);
  const fieldWrapper = createElement('div');
  const label = createElement('label');
  dom.setTextContent(label, placeholder);

  const input = createInputElement(dom, key);
  dom.setPlaceholder(input, placeholder);
  if (Object.hasOwn(data, key)) {
    dom.setValue(input, data[key]);
  }
  const onInput = createFieldInputHandler({
    dom,
    key,
    input,
    textInput,
    data,
  });
  dom.addEventListener(input, 'input', onInput);
  disposers.push(createInputListenerDisposer(dom, input, onInput));
  const wrapper = fieldWrapper;
  const appendToWrapper = createWrapperAppender(dom, wrapper);
  appendToWrapper(label);
  appendToWrapper(input);
  dom.appendChild(form, wrapper);
}

/**
 * Render a single field inside a form.
 * @param {{dom: object, form: HTMLElement, key: string, placeholder: string, data: object, textInput: HTMLInputElement, disposers: Function[]}} options - Field render options.
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
  createField(dom, form, {
    key,
    placeholder,
    data,
    textInput,
    disposers,
  });
}

/**
 * Render a specific field tuple with the given helpers.
 * @param {{dom: object, form: HTMLElement, data: object, textInput: HTMLInputElement, disposers: Function[]}} options - Rendering helpers.
 * @param {[string, string]} field - Tuple describing the field key and placeholder.
 * @returns {void}
 */
function renderField(
  { dom, form, data, textInput, disposers },
  [key, placeholder]
) {
  buildField({
    dom,
    form,
    key,
    placeholder,
    data,
    textInput,
    disposers,
  });
}

/**
 * Build a renderer for the field definitions list.
 * @param {{dom: object, form: HTMLElement, data: object, textInput: HTMLInputElement, disposers: Function[]}} options - Rendering helpers.
 * @returns {(field: [string, string]) => void} Renderer for each field tuple.
 */
function createFieldRenderer({ dom, form, data, textInput, disposers }) {
  return renderField.bind(null, {
    dom,
    form,
    data,
    textInput,
    disposers,
  });
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
 * @param {Function[]} disposers - Disposer functions to invoke.
 * @returns {() => void} Form-level dispose handler.
 */
function createDisposeForm(disposers) {
  return () => {
    disposers.forEach(runDisposer);
  };
}

/**
 * Hide and disable the hidden JSON input element.
 * @param {object} dom - DOM helpers.
 * @param {HTMLInputElement} textInput - Input to hide.
 * @returns {void}
 */
function prepareTextInput(dom, textInput) {
  hideAndDisable(textInput, dom);
}

/**
 * Invoke a remover helper with the shared container/dom args.
 * @param {Function} fn - Remover function to execute.
 * @param {HTMLElement} container - Container element to clean up.
 * @param {object} dom - DOM helpers.
 * @returns {void}
 */
function runRemover(fn, container, dom) {
  fn(container, dom);
}

/**
 * Run a remover helper bound to a specific container and DOM utilities.
 * @param {HTMLElement} container - Container element.
 * @param {object} dom - DOM helpers.
 * @param {Function} remover - Remover helper to invoke.
 * @returns {void}
 */
function runRemoverForContainer(container, dom, remover) {
  runRemover(remover, container, dom);
}

/**
 *
 * @param dom
 * @param container
 */
/**
 * Remove existing inputs and forms from the container.
 * @param {object} dom - DOM utilities.
 * @param {HTMLElement} container - Container element.
 * @returns {void}
 */
function cleanContainer(dom, container) {
  const removers = [
    maybeRemoveNumber,
    maybeRemoveKV,
    maybeRemoveTextarea,
    removeExistingForm,
  ];
  const runForContainer = runRemoverForContainer.bind(null, container, dom);
  removers.forEach(runForContainer);
}

/**
 * Create the buildForm implementation bound to a set of fields.
 * @param {Array<[string, string]>} fields - Field definitions to render.
 * @returns {(dom: object, options: {container: HTMLElement, textInput: HTMLInputElement, data: object, disposers: Function[]}) => HTMLElement} Form builder bound to `fields`.
 */
function createBuildForm(fields) {
  return function buildForm(dom, { container, textInput, data, disposers }) {
    const dendriteFormClassName = DENDRITE_FORM_SELECTOR.slice(1);
    const form = dom.createElement('div');
    dom.setClassName(form, dendriteFormClassName);
    const nextSibling = dom.getNextSibling(textInput);
    dom.insertBefore(container, form, nextSibling);

    const renderField = createFieldRenderer({
      dom,
      form,
      data,
      textInput,
      disposers,
    });
    fields.forEach(renderField);

    syncHiddenInput(dom, textInput, data);

    const disposeForm = createDisposeForm(disposers);
    form._dispose = disposeForm;

    return form;
  };
}

/**
 * Create a handler for rendering and managing a dendrite form.
 * @param {Array<[string, string]>} fields - Field definitions to render.
 * @returns {(dom: object, container: HTMLElement, textInput: HTMLInputElement) => HTMLElement} Generated handler function.
 */
export function createDendriteHandler(fields) {
  const buildForm = createBuildForm(fields);

  /**
   * Create and insert a dendrite form for editing data.
   * @param {object} dom - DOM utilities.
   * @param {HTMLElement} container - Container to insert into.
   * @param {HTMLInputElement} textInput - Hidden JSON input.
   * @returns {HTMLElement} Newly created form.
   */
  function createDendriteForm(dom, container, textInput) {
    const disposers = [];
    const data = parseDendriteData(dom, textInput);
    return buildForm(dom, { container, textInput, data, disposers });
  }

  return function dendriteHandler(dom, container, textInput) {
    prepareTextInput(dom, textInput);
    cleanContainer(dom, container);
    return createDendriteForm(dom, container, textInput);
  };
}
