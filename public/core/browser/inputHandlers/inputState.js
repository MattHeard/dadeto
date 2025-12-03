import { hideAndDisable as browserHideAndDisable } from '../browser-core.js';

export const hideAndDisable = browserHideAndDisable;

/**
 * Reveal and enable a DOM element.
 * @param {HTMLElement} element - Element to show.
 * @param {object} dom - DOM utilities.
 */
export function revealAndEnable(element, dom) {
  dom.reveal(element);
  dom.enable(element);
}
