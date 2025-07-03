/**
 * Common helper functions for input elements.
 * @module inputHelpers
 */

/**
 * Hides and disables a text input element using the provided DOM helpers.
 * @param {object} dom - DOM helper methods.
 * @param {HTMLElement} input - The input element to modify.
 */
export function hideAndDisableInput(dom, input) {
  dom.hide(input);
  dom.disable(input);
}
