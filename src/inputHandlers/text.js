import {
  maybeRemoveNumber,
  maybeRemoveKV,
  maybeRemoveDendrite,
} from './removeElements.js';
import { revealAndEnable } from './inputState.js';

export function textHandler(dom, container, textInput) {
  revealAndEnable(textInput, dom);
  maybeRemoveNumber(container, dom);
  maybeRemoveKV(container, dom);
  maybeRemoveDendrite(container, dom);
}
