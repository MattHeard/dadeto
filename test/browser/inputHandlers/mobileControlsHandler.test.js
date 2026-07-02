import { describe, expect, it, jest } from '@jest/globals';
import { mobileControlsHandler } from '../../../src/core/browser/inputHandlers/mobileControls.js';
import { readStoredOrElementValue } from '../../../src/core/browser/inputValueStore.js';

/**
 * Build a DOM helper mock for mobile controls tests.
 * @param {{
 *   checked: boolean,
 *   dispatchEvent: ReturnType<typeof jest.fn>,
 * }} autoSubmitCheckbox - Checkbox paired with the toy auto-submit setting.
 * @returns {Record<string, ReturnType<typeof jest.fn>>} Mock DOM helper bucket.
 */
function makeDom(autoSubmitCheckbox) {
  return {
    globalThis,
    createElement: jest.fn(tag => ({
      tag,
      _children: [],
      dataset: {},
      setAttribute: jest.fn(),
      dispatchEvent: jest.fn(),
      focus: jest.fn(),
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

describe('mobileControlsHandler', () => {
  it('creates button controls that emit keydown and keyup payloads', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };

    mobileControlsHandler(dom, container, textInput);

    const form = container._children[0];
    const controlWrap = form._children[1];
    const leftButton = controlWrap._children[0];

    leftButton._listeners.pointerdown({ preventDefault: jest.fn() });
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keydown',
      key: 'ArrowLeft',
    });

    leftButton._listeners.pointerdown({ preventDefault: jest.fn() });
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keydown',
      key: 'ArrowLeft',
    });

    leftButton._listeners.pointerup({ preventDefault: jest.fn() });
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keyup',
      key: 'ArrowLeft',
    });
  });

  it('treats pointer cancellation as a release', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };

    mobileControlsHandler(dom, container, textInput);

    const form = container._children[0];
    const controlWrap = form._children[1];
    const launchButton = controlWrap._children[2];

    launchButton._listeners.pointerdown({ preventDefault: jest.fn() });
    launchButton._listeners.pointercancel({ preventDefault: jest.fn() });
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keyup',
      key: ' ',
    });
  });

  it('ignores a release when the control was never pressed', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };

    mobileControlsHandler(dom, container, textInput);

    const form = container._children[0];
    const controlWrap = form._children[1];
    const pauseButton = controlWrap._children[3];

    pauseButton._listeners.pointerup({ preventDefault: jest.fn() });

    expect(readStoredOrElementValue(textInput)).toBe('');
    expect(pauseButton.setAttribute).toHaveBeenCalledWith(
      'aria-pressed',
      'false'
    );
  });

  it('marks the mobile control buttons as non-selectable and cleans up listeners', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };

    mobileControlsHandler(dom, container, textInput);

    const form = container._children[0];
    const controlWrap = form._children[1];
    const launchButton = controlWrap._children[2];

    expect(dom.addEventListener).toHaveBeenCalledWith(
      launchButton,
      'pointerleave',
      expect.any(Function)
    );
    expect(dom.addEventListener).toHaveBeenCalledWith(
      launchButton,
      'lostpointercapture',
      expect.any(Function)
    );

    expect(typeof form._dispose).toBe('function');
    form._dispose();

    expect(dom.removeEventListener).toHaveBeenCalledWith(
      launchButton,
      'pointerleave',
      expect.any(Function)
    );
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      launchButton,
      'lostpointercapture',
      expect.any(Function)
    );
  });
});
