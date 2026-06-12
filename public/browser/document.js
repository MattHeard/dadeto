import { createDocumentHandle } from '../core/browser/document.js';

const handle = createDocumentHandle();

export const {
  getElementById, querySelector, querySelectorAll, addClass, removeClass,
  setClassName, getAudioElements, removeControlsAttribute, createElement,
  createTextNode, getElementsByTagName, hasClass, hide, addEventListener,
  appendChild, insertBefore, removeChild, removeAllChildren, contains,
  stopDefault, playAudio, pauseAudio, log, warn, logError,
  requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval,
  setTimeout, clearTimeout, getGamepads, getClasses, getRandomNumber,
  getCurrentTime, getUuid, hasNextSiblingClass, addWarning, removeWarning,
  reveal, getCurrentTarget, getParentElement, getTargetValue, setTargetValue,
  getValue, setValue, enable, disable, getNextSibling, removeNextSibling,
  removeEventListener, hasBetaParam, setType, setPlaceholder, setDataAttribute,
  getDataAttribute, setTextContent, makeIntersectionObserver,
  disconnectObserver, isIntersecting, dom, hasNoInteractiveComponents,
  getInteractiveComponentCount, getInteractiveComponents,
} = handle;

export { createPrefixedLogger, createPrefixedLoggers } from '../core/browser/browser-core.js';
export { handle };
