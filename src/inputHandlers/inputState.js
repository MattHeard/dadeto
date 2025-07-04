/**
 *
 * @param element
 * @param dom
 */
export function hideAndDisable(element, dom) {
  dom.hide(element);
  dom.disable(element);
}

/**
 *
 * @param element
 * @param dom
 */
export function revealAndEnable(element, dom) {
  dom.reveal(element);
  dom.enable(element);
}
