import { dispose } from './default.js';

export function textHandler(dom, container, textInput) {
  dom.reveal(textInput);
  dom.enable(textInput);
  dispose(dom.querySelector(container, 'input[type="number"]'), dom, container);
  dispose(dom.querySelector(container, '.kv-container'), dom, container);
  dispose(dom.querySelector(container, '.dendrite-form'), dom, container);
}
