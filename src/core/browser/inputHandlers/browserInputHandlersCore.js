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
 * Reveal and enable a DOM element.
 * @param {HTMLElement} element - Element to show.
 * @param {object} dom - DOM utilities.
 * @returns {void} Ensures the element is both visible and interactive.
 */
export function revealAndEnable(element, dom) {
  const actions = [dom.reveal, dom.enable];
  actions.forEach(action => action.call(dom, element));
}
