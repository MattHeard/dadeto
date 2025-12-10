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
