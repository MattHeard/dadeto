import { dispose } from './default.js';
import {
  NUMBER_INPUT_SELECTOR,
  KV_CONTAINER_SELECTOR,
  DENDRITE_FORM_SELECTOR,
} from '../constants/selectors.js';

export function textHandler(dom, container, textInput) {
  dom.reveal(textInput);
  dom.enable(textInput);
  dispose(dom.querySelector(container, NUMBER_INPUT_SELECTOR), dom, container);
  dispose(dom.querySelector(container, KV_CONTAINER_SELECTOR), dom, container);
  dispose(dom.querySelector(container, DENDRITE_FORM_SELECTOR), dom, container);
}
