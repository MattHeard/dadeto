import {
  maybeRemoveNumber,
  maybeRemoveKV,
  maybeRemoveDendrite,
} from './removeElements.js';
import { hideAndDisable } from './inputState.js';

/**
 *
 * @param dom
 * @param container
 * @param textInput
 */
export function defaultHandler(dom, container, textInput) {
  hideAndDisable(textInput, dom);
  maybeRemoveNumber(container, dom);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
}
