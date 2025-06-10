import { ensureNumberInput } from '../browser/toys.js';

function maybeRemoveKV(container, dom) {
  const kvContainer = dom.querySelector(container, '.kv-container');
  if (kvContainer && typeof kvContainer._dispose === 'function') {
    kvContainer._dispose();
    dom.removeChild(container, kvContainer);
  }
}

export function numberHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);
  maybeRemoveKV(container, dom);
  ensureNumberInput(container, textInput, dom);
}
