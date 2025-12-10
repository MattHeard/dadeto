import { setInputValue } from '../inputValueStore.js';
const createDomValueSetter = dom => (textInput, targetValue) => {
  dom.setValue(textInput, targetValue);
};

const createTargetApplier = textInput => targetValue => handler =>
  handler(textInput, targetValue);

const createTextInputUpdater =
  (dom, applyTargetToHandlers, updateHandlers) => event => {
    const targetValue = dom.getTargetValue(event);
    const callWithTarget = applyTargetToHandlers(targetValue);
    updateHandlers.forEach(callWithTarget);
  };

export const createUpdateTextInputValue = (textInput, dom) => {
  const setTextInputValue = createDomValueSetter(dom);
  const updateHandlers = [setTextInputValue, setInputValue];
  const applyTargetToHandlers = createTargetApplier(textInput);
  return createTextInputUpdater(dom, applyTargetToHandlers, updateHandlers);
};

/**
 * Build a helper that invokes cleanup callbacks with shared container/dom args.
 * @param {HTMLElement} container - Element hosting the inputs.
 * @param {object} dom - DOM utilities.
 * @returns {Function} Invokes a list of handlers with the shared container/dom.
 */
export const createContainerHandlerInvoker = (container, dom) => handler =>
  handler(container, dom);

/**
 * Invoke a set of cleanup handlers for the supplied container/dom pair.
 * @param {HTMLElement} container Element hosting the inputs.
 * @param {object} dom DOM helper utilities.
 * @param {Array<Function>} handlers Handlers to invoke with the shared args.
 * @returns {void}
 */
export function invokeContainerHandlers(container, dom, handlers) {
  const invoke = createContainerHandlerInvoker(container, dom);
  handlers.forEach(invoke);
}

/**
 * Apply the shared handlers plus any extras for a container/dom pair.
 * @param {object} options Handler configuration.
 * @param {HTMLElement} options.container Parent element hosting the inputs.
 * @param {object} options.dom DOM helper utilities.
 * @param {Function[]} options.baseHandlers Core cleanup handlers that should always run.
 * @param {Function[]} [options.extraHandlers] Additional handlers to run ahead of the base stack.
 */
export function applyCleanupHandlers({
  container,
  dom,
  baseHandlers,
  extraHandlers = [],
}) {
  const handlers = [...extraHandlers, ...baseHandlers];
  invokeContainerHandlers(container, dom, handlers);
}

/**
 * Build a disposer that removes a registered input listener.
 * @param {object} dom - DOM utilities.
 * @param {HTMLElement} el - Element that had the listener attached.
 * @param {Function} handler - Handler previously registered.
 * @returns {() => void} Clean-up function.
 */
export const createInputDisposer = (dom, el, handler) => () =>
  dom.removeEventListener(el, 'input', handler);

/**
 * Attach shared lifecycle wiring for inputs that mirror the text input value.
 * @param {object} dom - DOM utilities.
 * @param {HTMLElement} input - The special input element to observe.
 * @param {Function} handler - Handler called when the input value changes.
 * @returns {void}
 */
export const setupInputEvents = (dom, input, handler) => {
  dom.addEventListener(input, 'input', handler);
  input._dispose = createInputDisposer(dom, input, handler);
};

/**
 * Insert an element right before the text input's next sibling.
 * @param {object} options - Insertion parameters.
 * @param {HTMLElement} options.container - Parent container holding the inputs.
 * @param {HTMLElement} options.textInput - Text input element to anchor positioning.
 * @param {HTMLElement} options.element - Element to insert.
 * @param {object} options.dom - DOM utilities.
 * @returns {void}
 */
export const insertBeforeNextSibling = ({
  container,
  textInput,
  element,
  dom,
}) => {
  const nextSibling = dom.getNextSibling(textInput);
  if (typeof dom.insertBefore === 'function') {
    dom.insertBefore(container, element, nextSibling);
    return;
  }

  container.insertBefore(element, nextSibling);
};

/**
 * Reveal and enable a DOM element.
 * @param {HTMLElement} element - Element to show.
 * @param {object} dom - DOM utilities.
 * @returns {void} Ensures the element is both visible and interactive.
 */
export function revealAndEnable(element, dom) {
  const actions = [dom.reveal, dom.enable];
  actions.forEach(action => action.call(dom, element));
}
