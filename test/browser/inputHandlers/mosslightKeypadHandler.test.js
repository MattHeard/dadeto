import { describe, expect, it, jest } from '@jest/globals';
import { mosslightKeypadHandler } from '../../../src/core/browser/inputHandlers/mosslightKeypad.js';
import { readStoredOrElementValue } from '../../../src/core/browser/inputValueStore.js';

/**
 *
 * @param autoSubmitCheckbox
 * @param textInput
 * @param animationFrames
 */
/**
 * Create the DOM-helper test double used by the keypad integration test.
 * @param {object} autoSubmitCheckbox - Auto-submit checkbox test node.
 * @param {object} textInput - Hidden game input test node.
 * @param {Array<Function>} animationFrames - Captured frame callbacks.
 * @returns {object} Minimal DOM-helper implementation.
 */
function makeDom(autoSubmitCheckbox, textInput, animationFrames) {
  return {
    globalThis,
    createElement: jest.fn(tag => ({
      tag,
      _children: [],
      setAttribute: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
    setClassName: jest.fn((element, className) => {
      element.className = className;
    }),
    setType: jest.fn((element, type) => {
      element.type = type;
    }),
    setTextContent: jest.fn((element, text) => {
      element.textContent = text;
    }),
    appendChild: jest.fn((parent, child) => parent._children.push(child)),
    insertBefore: jest.fn((parent, child) => parent._children.push(child)),
    getNextSibling: jest.fn(() => null),
    getParentElement: jest.fn(element => element.parentElement),
    addEventListener: jest.fn((element, eventName, handler) => {
      element._listeners ||= {};
      element._listeners[eventName] = handler;
    }),
    removeEventListener: jest.fn(),
    requestAnimationFrame: jest.fn(callback => animationFrames.push(callback)),
    querySelector: jest.fn((_container, selector) =>
      selector === '.auto-submit-checkbox'
        ? autoSubmitCheckbox
        : selector === 'input[type="text"]'
          ? textInput
          : null
    ),
    setValue: jest.fn((element, value) => {
      element.value = value;
    }),
    hide: jest.fn(),
    disable: jest.fn(),
    removeChild: jest.fn(),
  };
}

describe('mosslightKeypadHandler', () => {
  it('requires confirmation before submitting an embedded reset', () => {
    const textInput = { value: 'unchanged' };
    const checkbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(checkbox, textInput, []);
    dom.globalThis = {
      confirm: jest.fn(() => false),
      crypto: { randomUUID: jest.fn(() => 'confirmed-reset') },
    };
    const container = { _children: [] };
    mosslightKeypadHandler(dom, container, textInput);
    const button = container._children[0]._children[2];
    expect(button.textContent).toBe('Reset game');
    button._listeners.click();
    expect(textInput.value).toBe('unchanged');
    expect(checkbox.checked).toBe(false);
    expect(dom.globalThis.confirm).toHaveBeenCalledWith(
      expect.stringContaining('slot 01')
    );
    dom.globalThis.confirm.mockReturnValue(true);
    button._listeners.click();
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      reset: true,
      confirmed: true,
      resetId: 'confirmed-reset',
    });
    expect(checkbox.checked).toBe(true);
  });
  it('renders handheld controls and sends normalized actions to the toy', () => {
    const autoSubmitCheckbox = {
      checked: false,
      dispatchEvent: jest.fn(),
    };
    const textInput = { value: '' };
    const animationFrames = [];
    const fieldContainer = {};
    const container = { _children: [], parentElement: fieldContainer };
    const dom = makeDom(autoSubmitCheckbox, textInput, animationFrames);

    mosslightKeypadHandler(dom, container, null);

    const form = container._children[0];
    const keypad = form._children[1];
    expect(form.className).toBe('mosslight-keypad-form dendrite-form');
    expect(keypad.className).toBe('mosslight-keypad');
    expect(keypad._children.map(group => group.className)).toEqual([
      'mosslight-keypad-dpad',
      'mosslight-keypad-face',
      'mosslight-keypad-system',
    ]);
    expect(
      keypad._children
        .flatMap(group => group._children)
        .map(button => button.textContent)
    ).toEqual(['▲', '◀', '▼', '▶', 'B', 'A', 'SELECT', 'START']);

    const rightButton = keypad._children[0]._children[3];
    rightButton._listeners.click();
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keydown',
      key: 'ArrowRight',
    });
    animationFrames.shift()();
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keyup',
      key: 'ArrowRight',
    });
    const aButton = keypad._children[1]._children[1];
    aButton._listeners.click();
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keydown',
      key: 'z',
    });
    animationFrames.shift()();
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keyup',
      key: 'z',
    });
    expect(autoSubmitCheckbox.checked).toBe(true);
    expect(autoSubmitCheckbox.dispatchEvent).toHaveBeenCalled();
    expect(aButton.setAttribute).toHaveBeenCalledWith(
      'aria-label',
      'A · talk or confirm'
    );
    form._dispose();
    expect(dom.removeChild).toHaveBeenCalledWith(form, keypad);
  });

  it('uses explicit input when the handler container has no field parent', () => {
    const autoSubmitCheckbox = {
      checked: false,
      dispatchEvent: jest.fn(),
    };
    const textInput = { value: '' };
    const animationFrames = [];
    const dom = makeDom(autoSubmitCheckbox, textInput, animationFrames);
    const container = { _children: [] };

    mosslightKeypadHandler(dom, container, textInput);

    const keypad = container._children[0]._children[1];
    const upButton = keypad._children[0]._children[0];
    upButton._listeners.click();
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keydown',
      key: 'ArrowUp',
    });
    animationFrames.shift()();
    expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
      type: 'keyup',
      key: 'ArrowUp',
    });
  });
});
