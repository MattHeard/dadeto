/**
 * Hide and disable a DOM element.
 * @param {HTMLElement} element - Element to hide.
 * @param {object} dom - DOM utilities.
 */
export function hideAndDisable(element, dom) {
  dom.hide(element);
  dom.disable(element);
}

/**
 * Reveal and enable a DOM element.
 * @param {HTMLElement} element - Element to show.
 * @param {object} dom - DOM utilities.
 */
export function revealAndEnable(element, dom) {
  dom.reveal(element);
  dom.enable(element);
}
