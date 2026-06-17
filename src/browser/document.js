import { createDocumentHandle } from '../core/browser/document.js';

const handle = createDocumentHandle({
  documentObj: getDocumentObj(),
  windowObj: getWindowObj(),
  globalThisObj: globalThis,
  navigatorObj: getNavigatorObj(),
});

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

function getDocumentObj() {
  if (typeof document !== 'undefined') {
    return document;
  }

  return createDocumentFallback();
}

function getWindowObj() {
  if (typeof window !== 'undefined') {
    return window;
  }

  return createWindowFallback();
}

function getNavigatorObj() {
  if (typeof navigator !== 'undefined') {
    return navigator;
  }

  return createNavigatorFallback();
}

function createDocumentFallback() {
  return {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => {
      throw new Error('document is not available');
    },
    createTextNode: () => {
      throw new Error('document is not available');
    },
    getElementsByTagName: () => [],
    body: {
      classList: {
        add() {},
        remove() {},
      },
    },
  };
}

function createWindowFallback() {
  return {
    addEventListener() {},
    removeEventListener() {},
  };
}

function createNavigatorFallback() {
  return {
    getGamepads: () => [],
  };
}
