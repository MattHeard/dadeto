import { maybeRemoveElement } from './disposeHelpers.js';
import { hideAndDisableInput } from './inputHelpers.js';
import {
  NUMBER_INPUT_SELECTOR,
  KV_CONTAINER_SELECTOR,
  DENDRITE_FORM_SELECTOR,
} from '../constants/selectors.js';

/**
 *
 * @param element
 * @param dom
 * @param container
 */
export function dispose(element, dom, container) {
  maybeRemoveElement(element, container, dom);
}

/**
 *
 * @param dom
 * @param container
 * @param textInput
 */
export function defaultHandler(dom, container, textInput) {
  hideAndDisableInput(dom, textInput);
  const numberInput = dom.querySelector(container, NUMBER_INPUT_SELECTOR);
  dispose(numberInput, dom, container);
  const kvContainer = dom.querySelector(container, KV_CONTAINER_SELECTOR);
  dispose(kvContainer, dom, container);
  const dendriteForm = dom.querySelector(container, DENDRITE_FORM_SELECTOR);
  dispose(dendriteForm, dom, container);
}
