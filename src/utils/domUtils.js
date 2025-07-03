/**
 * Utility functions for DOM input elements
 */

/**
 * Hides and disables an input element.
 * @param {object} dom - DOM abstraction with hide and disable methods
 * @param {*} input - The input element to modify
 */
export function hideAndDisable(dom, input) {
  dom.hide(input);
  dom.disable(input);
}
