import {
  maybeRemoveNumber,
  maybeRemoveKV,
  maybeRemoveDendrite,
} from './removeElements.js';
import { hideAndDisable } from './inputState.js';

export function defaultHandler(dom, container, textInput) {
  hideAndDisable(textInput, dom);
  maybeRemoveNumber(container, dom);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
}
