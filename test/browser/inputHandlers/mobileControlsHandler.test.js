import { describe, expect, it, jest } from '@jest/globals';
import {
  mobileControlsHandler,
  createKeyPayload,
  wireButton,
} from '../../../src/core/browser/inputHandlers/mobileControls.js';
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
    querySelector: jest.fn((_el, selector) => {
      if (selector === '.auto-submit-checkbox') return autoSubmitCheckbox;
      return null;
    }),
    setValue: jest.fn((el, value) => {
      el.value = value;
    }),
    hide: jest.fn(),
    disable: jest.fn(),
    removeChild: jest.fn(),
  };
}

describe('mobileControlsHandler', () => {
  it('creates keyboard payloads and wires repeated press/release safely', () => {
    const button = { setAttribute: jest.fn() };
    const dom = makeDom(null);
    const textInput = { value: '' };
    expect(createKeyPayload('keydown', 'x')).toEqual({
      type: 'keydown',
      key: 'x',
    });
    const cleanup = wireButton({
      dom,
      button,
      textInput,
      autoSubmitCheckbox: null,
      key: 'x',
    });
    const event = { preventDefault: jest.fn() };
    const writesBeforePress = dom.setValue.mock.calls.length;
    button._listeners.pointerdown(event);
    button._listeners.pointerdown(event);
    expect(dom.setValue.mock.calls.length - writesBeforePress).toBe(1);
    expect(button.setAttribute).toHaveBeenLastCalledWith('aria-pressed', 'true');
    button._listeners.pointerup(event);
    button._listeners.pointerup(event);
    expect(button.setAttribute).toHaveBeenLastCalledWith('aria-pressed', 'false');
    expect(event.preventDefault).toHaveBeenCalledTimes(4);
    expect(cleanup).toHaveLength(5);
    cleanup.forEach(dispose => dispose());
    expect(dom.removeEventListener).toHaveBeenCalledTimes(5);
    for (const eventName of [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'pointerleave',
      'lostpointercapture',
    ]) {
      expect(dom.removeEventListener).toHaveBeenCalledWith(
        button,
        eventName,
        expect.any(Function)
      );
    }
  });

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
    expect(controlWrap._children.map(button => button.textContent)).toEqual([
      'Left', 'Right', 'Launch', 'Pause', 'Reset',
    ]);
    expect(controlWrap._children.map(button => button.type)).toEqual([
      'button', 'button', 'button', 'button', 'button',
    ]);
    expect(form.className).toBe('mobile-controls-form');
    expect(controlWrap.className).toBe('mobile-controls-grid');
    expect(controlWrap.tag).toBe('div');
    expect(controlWrap._children.map(button => button.tag)).toEqual([
      'button', 'button', 'button', 'button', 'button',
    ]);
    expect(controlWrap._children.map(button =>
      button.setAttribute.mock.calls.at(-1)
    )).toEqual([
      ['aria-pressed', 'false'],
      ['aria-pressed', 'false'],
      ['aria-pressed', 'false'],
      ['aria-pressed', 'false'],
      ['aria-pressed', 'false'],
    ]);

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

    const expectedKeys = ['ArrowLeft', 'ArrowRight', ' ', 'p', 'r'];
    controlWrap._children.forEach((button, index) => {
      button._listeners.pointerdown({});
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'keydown',
        key: expectedKeys[index],
      });
      button._listeners.pointerup({});
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
    expect(dom.querySelector).toHaveBeenCalledWith(
      container,
      '.auto-submit-checkbox'
    );
    expect(dom.setTextContent).toHaveBeenCalledWith(
      form._children[0],
      'Controls'
    );
    expect(form._children[0].setAttribute).toHaveBeenCalledWith(
      'hidden',
      'hidden'
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
    expect(dom.removeEventListener).toHaveBeenCalledTimes(25);
    expect(dom.removeChild).toHaveBeenCalledWith(form, controlWrap);
  });
});
