import { setInputValue } from '../inputValueStore.js';

/** @typedef {import('../browser-core.js').DOMEventListener} DOMEventListener */
/** @typedef {import('../inputValueStore.js').ElementWithValue} ElementWithValue */
/** @typedef {typeof import('../../../browser/document.js').dom} BrowserDom */
/**
 * @typedef {{
 *   container: HTMLElement;
 *   textInput: ElementWithValue;
 *   element: HTMLElement;
 *   dom: BrowserDom;
 * }} InsertBeforeOptions
 */
/** @typedef {(textInput: ElementWithValue, targetValue: string) => void} TextInputUpdateHandler */
/**
 * @param {BrowserDom} dom - DOM utilities.
 * @returns {TextInputUpdateHandler} Setter that writes target values back to the DOM.
 */
const createDomValueSetter = dom => (textInput, targetValue) => {
  dom.setValue(textInput, targetValue);
};

/**
 * @param {ElementWithValue} textInput - Input paired with the target values.
 * @returns {(targetValue: string) => (handler: TextInputUpdateHandler) => void} Function that binds the current value to handlers.
 */
const createTargetApplier = textInput => targetValue => handler =>
  handler(textInput, targetValue);

/**
 * @param {BrowserDom} dom - DOM utilities.
 * @param {(targetValue: string) => (handler: TextInputUpdateHandler) => void} applyTargetToHandlers - Apply the current target to each handler.
 * @param {TextInputUpdateHandler[]} updateHandlers - Handlers that mirror the input value.
 * @returns {(event: Event) => void} Handler that syncs the DOM target value.
 */
const createTextInputUpdater =
  (dom, applyTargetToHandlers, updateHandlers) =>
  /**
   * @param {Event} event - Input event to read from.
   */
  event => {
    const targetValue = dom.getTargetValue(event);
    const callWithTarget = applyTargetToHandlers(targetValue);
    updateHandlers.forEach(callWithTarget);
  };

/**
 * @param {ElementWithValue} textInput - Input element to mirror.
 * @param {BrowserDom} dom - DOM utilities.
 * @returns {(event: Event) => void} Input handler that keeps helpers aligned.
 */
export const createUpdateTextInputValue = (textInput, dom) => {
  const setTextInputValue = createDomValueSetter(dom);
  const updateHandlers = [setTextInputValue, setInputValue];
  const applyTargetToHandlers = createTargetApplier(textInput);
  return createTextInputUpdater(dom, applyTargetToHandlers, updateHandlers);
};

/**
 * Build a disposer that removes a registered input listener.
 * @param {BrowserDom} dom - DOM utilities.
 * @param {HTMLElement} el - Element that had the listener attached.
 * @param {DOMEventListener} handler - Handler previously registered.
 * @returns {() => void} Clean-up function.
 */
export const createInputDisposer = (dom, el, handler) => () =>
  dom.removeEventListener(el, 'input', handler);

/**
 * Attach shared lifecycle wiring for inputs that mirror the text input value.
 * @param {BrowserDom} dom - DOM utilities.
 * @param {HTMLElement & { _dispose?: () => void }} input - The special input element to observe.
 * @param {DOMEventListener} handler - Handler called when the input value changes.
 * @returns {void}
 */
export const setupInputEvents = (dom, input, handler) => {
  dom.addEventListener(input, 'input', handler);
  input._dispose = createInputDisposer(dom, input, handler);
};

/**
 * Insert an element right before the text input's next sibling.
 * @param {InsertBeforeOptions} options - Insertion parameters.
 * @param {HTMLElement} options.container - Parent container holding the inputs.
 * @param {HTMLElement} options.textInput - Text input element to anchor positioning.
 * @param {HTMLElement} options.element - Element to insert.
 * @param {BrowserDom} options.dom - DOM utilities.
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
 * @param {BrowserDom} dom - DOM utilities.
 * @returns {void} Ensures the element is both visible and interactive.
 */
export function revealAndEnable(element, dom) {
  const actions = [dom.reveal, dom.enable];
  actions.forEach(action => action.call(dom, element));
}
