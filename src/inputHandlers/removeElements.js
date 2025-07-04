import { maybeRemoveElement } from './disposeHelpers.js';
import {
  NUMBER_INPUT_SELECTOR,
  KV_CONTAINER_SELECTOR,
  DENDRITE_FORM_SELECTOR,
} from '../constants/selectors.js';

/**
 * Removes a number input element if present.
 * @param {*} container - DOM container
 * @param {object} dom - DOM abstraction
 */
export function maybeRemoveNumber(container, dom) {
  const numberInput = dom.querySelector(container, NUMBER_INPUT_SELECTOR);
  maybeRemoveElement(numberInput, container, dom);
}

/**
 * Removes a key-value container if present.
 * @param {*} container - DOM container
 * @param {object} dom - DOM abstraction
 */
export function maybeRemoveKV(container, dom) {
  const kvContainer = dom.querySelector(container, KV_CONTAINER_SELECTOR);
  maybeRemoveElement(kvContainer, container, dom);
}

/**
 * Removes a dendrite form if present.
 * @param {*} container - DOM container
 * @param {object} dom - DOM abstraction
 */
export function maybeRemoveDendrite(container, dom) {
  const dendriteForm = dom.querySelector(container, DENDRITE_FORM_SELECTOR);
  maybeRemoveElement(dendriteForm, container, dom);
}
