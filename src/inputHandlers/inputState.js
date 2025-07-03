export function hideAndDisable(element, dom) {
  dom.hide(element);
  dom.disable(element);
}

export function revealAndEnable(element, dom) {
  dom.reveal(element);
  dom.enable(element);
}
