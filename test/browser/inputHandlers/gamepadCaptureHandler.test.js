import { describe, expect, it, jest } from '@jest/globals';
import { gamepadCaptureHandler } from '../../../src/core/browser/inputHandlers/gamepadCapture.js';
import { readStoredOrElementValue } from '../../../src/core/browser/inputValueStore.js';

/**
 * Create mock global listener bindings.
 * @returns {{
 *   listeners: Record<string, Function>,
 *   addEventListener: ReturnType<typeof jest.fn>,
 *   removeEventListener: ReturnType<typeof jest.fn>,
 * }} Listener registry used to capture global event handlers.
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
 * Build a DOM helper mock for the gamepad capture tests.
 * @param {{ checked: boolean, dispatchEvent: ReturnType<typeof jest.fn> }} autoSubmitCheckbox
 *   Checkbox paired with the toy auto-submit setting.
 * @returns {Record<string, ReturnType<typeof jest.fn>>} Mock DOM helper bucket.
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

/**
 * @param {{
 *   buttons?: Array<{ pressed: boolean, value: number }>,
 *   axes?: number[],
 *   connected?: boolean,
 *   id?: string,
 *   index?: number,
 *   mapping?: string,
 *   timestamp?: number,
 * }} [overrides] Partial gamepad properties to override for the test fixture.
 * @returns {Gamepad} Test-friendly gamepad fixture.
 */
function createGamepad(overrides = {}) {
  return /** @type {Gamepad} */ ({
    axes: overrides.axes ?? [0, 0],
    buttons: overrides.buttons ?? [
      { pressed: false, value: 0 },
      { pressed: false, value: 0 },
    ],
    connected: overrides.connected ?? true,
    id: overrides.id ?? 'Nintendo Joy-Con (R)',
    index: overrides.index ?? 0,
    mapping: overrides.mapping ?? 'standard',
    timestamp: overrides.timestamp ?? 1,
  });
}

describe('gamepadCaptureHandler', () => {
  it('creates a gamepad capture form and toggles capture on button click', () => {
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
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const previousNavigator = globalThis.navigator;
    globalThis.addEventListener = globals.addEventListener;
    globalThis.removeEventListener = globals.removeEventListener;
    globalThis.requestAnimationFrame = jest.fn(() => 17);
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = { getGamepads: jest.fn(() => []) };

    try {
      gamepadCaptureHandler(dom, container, textInput);

      const form = container._children[0];
      const button = form._children[0];
      button._listeners.click();

      expect(button.textContent).toBe('Release gamepad');
      expect(autoSubmitCheckbox.checked).toBe(true);
      expect(autoSubmitCheckbox.dispatchEvent).toHaveBeenCalled();
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'capture',
        capturing: true,
      });
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      globalThis.navigator = previousNavigator;
    }
  });

  it('forwards connect, button, axis, and disconnect events while captured', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };
    const globals = createGlobalListenerRegistry();
    const frames = [];
    let gamepads = [];
    const previousAdd = globalThis.addEventListener;
    const previousRemove = globalThis.removeEventListener;
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const previousNavigator = globalThis.navigator;
    globalThis.addEventListener = globals.addEventListener;
    globalThis.removeEventListener = globals.removeEventListener;
    globalThis.requestAnimationFrame = jest.fn(callback => {
      frames.push(callback);
      return frames.length;
    });
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = {
      getGamepads: jest.fn(() => gamepads),
    };

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];
      button._listeners.click();

      const connectedGamepad = createGamepad();
      globals.listeners.gamepadconnected({ gamepad: connectedGamepad });

      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'gamepadconnected',
        gamepadIndex: 0,
        gamepadId: 'Nintendo Joy-Con (R)',
        mapping: 'standard',
        connected: true,
        timestamp: 1,
        axes: [0, 0],
        buttons: [
          { pressed: false, value: 0 },
          { pressed: false, value: 0 },
        ],
      });

      gamepads = [
        createGamepad({
          buttons: [
            { pressed: true, value: 1 },
            { pressed: false, value: 0 },
          ],
          timestamp: 2,
        }),
      ];
      frames.shift()();
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'button',
        gamepadIndex: 0,
        gamepadId: 'Nintendo Joy-Con (R)',
        mapping: 'standard',
        connected: true,
        timestamp: 2,
        buttonIndex: 0,
        pressed: true,
        value: 1,
      });

      gamepads = [
        createGamepad({
          buttons: [
            { pressed: true, value: 1 },
            { pressed: false, value: 0 },
          ],
          axes: [0.5, 0],
          timestamp: 3,
        }),
      ];
      frames.shift()();
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'axis',
        gamepadIndex: 0,
        gamepadId: 'Nintendo Joy-Con (R)',
        mapping: 'standard',
        connected: true,
        timestamp: 3,
        axisIndex: 0,
        value: 0.5,
      });

      globals.listeners.gamepaddisconnected({
        gamepad: createGamepad({ connected: false, timestamp: 4 }),
      });
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'gamepaddisconnected',
        gamepadIndex: 0,
        gamepadId: 'Nintendo Joy-Con (R)',
        mapping: 'standard',
        connected: false,
        timestamp: 4,
        axes: [0, 0],
        buttons: [
          { pressed: false, value: 0 },
          { pressed: false, value: 0 },
        ],
      });
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      globalThis.navigator = previousNavigator;
    }
  });

  it('releases capture on escape', () => {
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
    const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
    const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const previousNavigator = globalThis.navigator;
    globalThis.addEventListener = globals.addEventListener;
    globalThis.removeEventListener = globals.removeEventListener;
    globalThis.requestAnimationFrame = jest.fn(() => 3);
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = { getGamepads: jest.fn(() => []) };

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];
      button._listeners.click();

      globals.listeners.keydown({
        type: 'keydown',
        key: 'Escape',
        preventDefault: jest.fn(),
      });

      expect(button.textContent).toBe('Capture gamepad');
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(3);
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'capture',
        capturing: false,
      });
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      globalThis.navigator = previousNavigator;
    }
  });
});
