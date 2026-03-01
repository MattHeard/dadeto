import { describe, expect, it, jest } from '@jest/globals';
import { keyboardCaptureHandler } from '../../../src/core/browser/inputHandlers/keyboardCapture.js';
import { readStoredOrElementValue } from '../../../src/core/browser/inputValueStore.js';

/**
 * Create mock global listener bindings.
 * @returns {{ listeners: Record<string, Function>, addEventListener: ReturnType<typeof jest.fn>, removeEventListener: ReturnType<typeof jest.fn> }} Listener registry.
 */
function createGlobalListenerRegistry() {
  const listeners = {};
  return {
    listeners,
    addEventListener: jest.fn((event, handler) => {
      listeners[event] = handler;
    }),
    removeEventListener: jest.fn((event, handler) => {
      if (listeners[event] === handler) {
        delete listeners[event];
      }
    }),
  };
}

/**
 * Build a DOM helper mock for keyboard capture tests.
 * @param {{ checked: boolean, dispatchEvent: ReturnType<typeof jest.fn> }} autoSubmitCheckbox - Checkbox paired with the toy.
 * @returns {Record<string, ReturnType<typeof jest.fn>>} Mock DOM helper set.
 */
function makeDom(autoSubmitCheckbox) {
  return {
    createElement: jest.fn(tag => ({
      tag,
      _children: [],
      dispatchEvent: jest.fn(),
    })),
    setClassName: jest.fn((el, cls) => {
      el.className = cls;
    }),
    setType: jest.fn((el, type) => {
      el.type = type;
    }),
    setTextContent: jest.fn((el, text) => {
      el.textContent = text;
    }),
    appendChild: jest.fn((parent, child) => {
      parent._children.push(child);
    }),
    getNextSibling: jest.fn(() => null),
    insertBefore: jest.fn((parent, child) => {
      parent._children.push(child);
    }),
    addEventListener: jest.fn((el, event, handler) => {
      el._listeners = el._listeners ?? {};
      el._listeners[event] = handler;
    }),
    removeEventListener: jest.fn(),
    querySelector: jest.fn((_el, selector) =>
      selector === '.auto-submit-checkbox' ? autoSubmitCheckbox : null
    ),
    setValue: jest.fn((el, value) => {
      el.value = value;
    }),
    hide: jest.fn(),
    disable: jest.fn(),
    removeChild: jest.fn(),
  };
}

describe('keyboardCaptureHandler', () => {
  it('creates a keyboard capture form and toggles capture on button click', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };
    const globals = createGlobalListenerRegistry();

    const previousAdd = globalThis.addEventListener;
    const previousRemove = globalThis.removeEventListener;
    globalThis.addEventListener = globals.addEventListener;
    globalThis.removeEventListener = globals.removeEventListener;

    try {
      keyboardCaptureHandler(dom, container, textInput);

      const form = container._children[0];
      const button = form._children[0];
      button._listeners.click();

      expect(button.textContent).toBe('Release keyboard');
      expect(autoSubmitCheckbox.checked).toBe(true);
      expect(autoSubmitCheckbox.dispatchEvent).toHaveBeenCalled();
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'capture',
        capturing: true,
      });
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
    }
  });

  it('forwards key events while captured and releases capture on escape', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };
    const globals = createGlobalListenerRegistry();

    const previousAdd = globalThis.addEventListener;
    const previousRemove = globalThis.removeEventListener;
    globalThis.addEventListener = globals.addEventListener;
    globalThis.removeEventListener = globals.removeEventListener;

    try {
      keyboardCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];
      button._listeners.click();

      globals.listeners.keydown({
        type: 'keydown',
        key: 'ArrowUp',
        preventDefault: jest.fn(),
      });
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'keydown',
        key: 'ArrowUp',
      });

      globals.listeners.keydown({
        type: 'keydown',
        key: 'Escape',
        preventDefault: jest.fn(),
      });
      expect(button.textContent).toBe('Capture keyboard');
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'capture',
        capturing: false,
      });
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
    }
  });
});
