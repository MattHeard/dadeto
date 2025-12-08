import { setInputValue } from '../inputValueStore.js';

/**
 * Selector used to locate dendrite forms in the DOM.
 * @type {string}
 */
export const DENDRITE_FORM_SELECTOR = '.dendrite-form';

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
 * Build a factory that creates a specialized input (e.g., number) with synced value/handler.
 * @param {object} options - Factory parameters.
 * @param {HTMLElement} options.textInput - The hidden/text input element whose value drives the special input.
 * @param {object} options.dom - DOM utilities.
 * @param {Function} options.createNumberInput - Function that instantiates the specialized input.
 * @param {Function} options.getValue - Reads the source value that seeds the specialized input.
 * @returns {Function} Factory that yields the specialized input element when invoked.
 */
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
 * Reveal and enable a DOM element.
 * @param {HTMLElement} element - Element to show.
 * @param {object} dom - DOM utilities.
 * @returns {void} Ensures the element is both visible and interactive.
 */
export function revealAndEnable(element, dom) {
  const actions = [dom.reveal, dom.enable];
  actions.forEach(action => action.call(dom, element));
}
