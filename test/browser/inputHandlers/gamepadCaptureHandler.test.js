import { describe, expect, it, jest } from '@jest/globals';
import {
  gamepadCaptureHandler,
  gamepadCaptureTestOnly,
} from '../../../src/core/browser/inputHandlers/gamepadCapture.js';
import { readStoredOrElementValue } from '../../../src/core/browser/inputValueStore.js';

/**
 * Create mock global listener bindings.
 * @returns {{
 *   listeners: Record<string, (...args: never[]) => unknown>,
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
    globalThis,
    requestAnimationFrame: callback =>
      globalThis.requestAnimationFrame(callback),
    cancelAnimationFrame: frameId => globalThis.cancelAnimationFrame(frameId),
    getGamepads: () => globalThis.navigator.getGamepads(),
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
  return /** @type {Gamepad} */ (
    Object.assign(
      {
        axes: [0, 0],
        buttons: [
          { pressed: false, value: 0 },
          { pressed: false, value: 0 },
        ],
        connected: true,
        id: 'Nintendo Joy-Con (R)',
        index: 0,
        mapping: 'standard',
        timestamp: 1,
      },
      overrides
    )
  );
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
});

describe('gamepad capture pure helpers', () => {
  it('preserves helper boundary behavior', () => {
    const gamepad = createGamepad({ buttons: [{ pressed: false, value: 0 }], axes: [0] });
    expect(gamepadCaptureTestOnly.buildGamepadMetadata(gamepad, {
      connected: true,
      dom: { getGamepads: () => [gamepad] },
    })).toMatchObject({
      gamepadIndex: 0,
      connected: true,
    });
    expect(gamepadCaptureTestOnly.didAxisChange(0, 0.01)).toBe(true);
    expect(gamepadCaptureTestOnly.didAxisChange(0, 0.009)).toBe(false);
    expect(gamepadCaptureTestOnly.didAxisChange(0.2, 0.2)).toBe(false);
    expect(gamepadCaptureTestOnly.didButtonChange({ pressed: false, value: 0 }, { pressed: true, value: 0 })).toBe(true);
    expect(gamepadCaptureTestOnly.hasButtonValueChanged({ pressed: true, value: 0 }, { pressed: true, value: 1 })).toBe(true);
    expect(gamepadCaptureTestOnly.getPreviousButtons(undefined)).toEqual([]);
    expect(gamepadCaptureTestOnly.didTrackedAxisChange(undefined, 0.02)).toBe(true);
    expect(gamepadCaptureTestOnly.didTrackedAxisChange(0.5, 0.5)).toBe(false);
    expect(gamepadCaptureTestOnly.isPresentGamepad(gamepad)).toBe(true);
    expect(gamepadCaptureTestOnly.isPresentGamepad(null)).toBe(false);
    expect(gamepadCaptureTestOnly.toConnectedGamepads([gamepad, null])).toEqual([gamepad]);
    const state = { snapshots: { 0: { old: true } }, animationFrameId: 3 };
    gamepadCaptureTestOnly.resetSnapshots(state);
    expect(state.snapshots).toEqual({});
    expect(gamepadCaptureTestOnly.shouldQueuePoll({ capturing: true, animationFrameId: null })).toBe(true);
    expect(gamepadCaptureTestOnly.shouldQueuePoll({ capturing: true, animationFrameId: 3 })).toBe(false);
    expect(gamepadCaptureTestOnly.shouldQueuePoll({ capturing: false, animationFrameId: null })).toBe(false);
    gamepadCaptureTestOnly.storeSnapshot(state, gamepad);
    expect(state.snapshots[0]).toEqual({ axes: [0], buttons: [{ pressed: false, value: 0 }] });
    const event = { preventDefault: jest.fn() };
    gamepadCaptureTestOnly.preventDefault(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    gamepadCaptureTestOnly.preventDefault({});
    const cancelAnimationFrame = jest.fn();
    const cleanupState = { animationFrameId: 9, snapshots: { 0: { axes: [1] } } };
    gamepadCaptureTestOnly.createGamepadCleanupHandler({
      state: cleanupState,
      dom: { cancelAnimationFrame },
    })();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(9);
    expect(cleanupState).toEqual({ animationFrameId: null, snapshots: {} });
    const getGamepads = jest.fn(() => []);
    gamepadCaptureTestOnly.pollGamepads({
      state: { capturing: false, snapshots: {} },
      dom: { getGamepads },
    });
    expect(getGamepads).not.toHaveBeenCalled();
    const storedState = { snapshots: { 0: { axes: [1] } } };
    gamepadCaptureTestOnly.removeSnapshot(storedState, gamepad);
    expect(storedState.snapshots).toEqual({});
  });
});

describe('gamepad capture events', () => {
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
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    Object.assign(globalThis, {
      addEventListener: globals.addEventListener,
      removeEventListener: globals.removeEventListener,
      requestAnimationFrame: jest.fn(callback => {
        frames.push(callback);
        return frames.length;
      }),
      cancelAnimationFrame: jest.fn(),
      navigator: { getGamepads: jest.fn(() => gamepads) },
    });

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];
      button._listeners.click();

      const connectedGamepad = createGamepad();
      gamepads = [connectedGamepad];
      globals.listeners.gamepadconnected({ gamepad: connectedGamepad });

      expect(JSON.parse(readStoredOrElementValue(textInput))).toMatchObject({
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
      expect(JSON.parse(readStoredOrElementValue(textInput))).not.toHaveProperty(
        'connectedGamepads'
      );
      expect(frames).toHaveLength(1);
      expect(logSpy).toHaveBeenCalledWith('[gamepadCapture]', 'connected', {
        index: 0,
        id: 'Nintendo Joy-Con (R)',
        mapping: 'standard',
        connected: true,
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
      expect(JSON.parse(readStoredOrElementValue(textInput))).toMatchObject({
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
      expect(JSON.parse(readStoredOrElementValue(textInput))).toMatchObject({
        type: 'axis',
        gamepadIndex: 0,
        gamepadId: 'Nintendo Joy-Con (R)',
        mapping: 'standard',
        connected: true,
        timestamp: 3,
        axisIndex: 0,
        value: 0.5,
      });

      const framesBeforeDisconnect = frames.length;
      globals.listeners.gamepaddisconnected({
        gamepad: createGamepad({ connected: false, timestamp: 4 }),
      });
      expect(JSON.parse(readStoredOrElementValue(textInput))).toMatchObject({
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
      expect(frames).toHaveLength(framesBeforeDisconnect);
      const state = { snapshots: { 0: { connected: true } } };
      gamepadCaptureTestOnly.removeSnapshot(state, null);
      expect(state.snapshots).toEqual({ 0: { connected: true } });
      expect(
        gamepadCaptureTestOnly.logGamepadEvent('connected', null)
      ).toBeUndefined();
    } finally {
      Object.assign(globalThis, {
        addEventListener: previousAdd,
        removeEventListener: previousRemove,
        requestAnimationFrame: previousRequestAnimationFrame,
        cancelAnimationFrame: previousCancelAnimationFrame,
        navigator: previousNavigator,
      });
      logSpy.mockRestore();
    }
  });
});

describe('gamepad capture state', () => {
  it('includes all connected gamepads when more than one controller is active', () => {
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
    const leftJoyCon = createGamepad({ index: 0, id: 'Joy-Con Left' });
    const rightJoyCon = createGamepad({ index: 1, id: 'Joy-Con Right' });
    globalThis.addEventListener = globals.addEventListener;
    globalThis.removeEventListener = globals.removeEventListener;
    globalThis.requestAnimationFrame = jest.fn(() => 17);
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = {
      getGamepads: jest.fn(() => [leftJoyCon, rightJoyCon]),
    };

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];
      button._listeners.click();

      globals.listeners.gamepadconnected({ gamepad: leftJoyCon });

      expect(JSON.parse(readStoredOrElementValue(textInput))).toMatchObject({
        type: 'gamepadconnected',
        gamepadIndex: 0,
        gamepadId: 'Joy-Con Left',
        connectedGamepads: [
          {
            gamepadIndex: 0,
            gamepadId: 'Joy-Con Left',
            connected: true,
          },
          {
            gamepadIndex: 1,
            gamepadId: 'Joy-Con Right',
            connected: true,
          },
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
});

describe('gamepad polling', () => {
  it('skips syncing when a poll sees no new payload', () => {
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
      gamepads = [connectedGamepad];
      globals.listeners.gamepadconnected({ gamepad: connectedGamepad });

      const baseline = JSON.parse(readStoredOrElementValue(textInput));
      expect(frames.length).toBeGreaterThan(0);

      frames.shift()();

      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual(baseline);
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      globalThis.navigator = previousNavigator;
    }
  });
});

describe('inactive capture handling', () => {
  it('ignores connection events when capture is inactive', () => {
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
    globalThis.requestAnimationFrame = jest.fn();
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = { getGamepads: jest.fn(() => []) };

    try {
      gamepadCaptureHandler(dom, container, textInput);

      globals.listeners.gamepadconnected({ gamepad: createGamepad() });

      expect(textInput.value).toBe('');
      expect(autoSubmitCheckbox.checked).toBe(false);
      expect(autoSubmitCheckbox.dispatchEvent).not.toHaveBeenCalled();
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      globalThis.navigator = previousNavigator;
    }
  });
});

describe('inactive disconnection handling', () => {
  it('ignores disconnection events when capture is inactive', () => {
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
    globalThis.requestAnimationFrame = jest.fn();
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = {
      getGamepads: jest.fn(() => []),
    };

    try {
      gamepadCaptureHandler(dom, container, textInput);

      globals.listeners.gamepaddisconnected({ gamepad: createGamepad() });

      expect(readStoredOrElementValue(textInput)).toBe('');
      expect(autoSubmitCheckbox.checked).toBe(false);
      expect(autoSubmitCheckbox.dispatchEvent).not.toHaveBeenCalled();
      expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
      expect(globalThis.cancelAnimationFrame).not.toHaveBeenCalled();
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      globalThis.navigator = previousNavigator;
    }
  });
});

describe('unidentifiable gamepads', () => {
  it('ignores connection events without identifiable gamepads while capturing', () => {
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
    globalThis.requestAnimationFrame = jest.fn(() => 7);
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = { getGamepads: jest.fn(() => []) };

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];
      button._listeners.click();

      globals.listeners.gamepadconnected({});

      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'capture',
        capturing: true,
      });
      expect(autoSubmitCheckbox.checked).toBe(true);
      expect(autoSubmitCheckbox.dispatchEvent).toHaveBeenCalled();
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      globalThis.navigator = previousNavigator;
    }
  });
});

describe('capture keyboard handling', () => {
  it('ignores non-keydown escape events while capturing', () => {
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
    globalThis.requestAnimationFrame = jest.fn(() => 7);
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = { getGamepads: jest.fn(() => []) };

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];
      button._listeners.click();

      const preventDefault = jest.fn();
      globals.listeners.keydown({
        type: 'keyup',
        key: 'Escape',
        preventDefault,
      });

      expect(button.textContent).toBe('Release gamepad');
      expect(preventDefault).not.toHaveBeenCalled();
      expect(JSON.parse(readStoredOrElementValue(textInput))).toEqual({
        type: 'capture',
        capturing: true,
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

describe('initial gamepad polling', () => {
  it('emits the first polled button payload when a gamepad is already present', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };
    const globals = createGlobalListenerRegistry();
    const frames = [];
    const gamepads = [createGamepad()];
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

      frames.shift()();

      expect(JSON.parse(readStoredOrElementValue(textInput))).toMatchObject({
        type: 'button',
        gamepadIndex: 0,
        gamepadId: 'Nintendo Joy-Con (R)',
        mapping: 'standard',
        connected: true,
        timestamp: 1,
        buttonIndex: 0,
        pressed: false,
        value: 0,
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

describe('initial axis polling', () => {
  it('emits the first polled axis payload when a gamepad is already present', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };
    const globals = createGlobalListenerRegistry();
    const frames = [];
    const gamepads = [
      createGamepad({
        buttons: [],
        axes: [0.5, 0],
      }),
    ];
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

      frames.shift()();

      expect(JSON.parse(readStoredOrElementValue(textInput))).toMatchObject({
        type: 'axis',
        gamepadIndex: 0,
        gamepadId: 'Nintendo Joy-Con (R)',
        mapping: 'standard',
        connected: true,
        timestamp: 1,
        axisIndex: 0,
        value: 0.5,
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

describe('escape handling', () => {
  it('ignores escape events when capture is inactive', () => {
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
    globalThis.requestAnimationFrame = jest.fn();
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = { getGamepads: jest.fn(() => []) };

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];

      globals.listeners.keydown({
        type: 'keydown',
        key: 'Escape',
        preventDefault: jest.fn(),
      });

      expect(button.textContent).toBe('Capture gamepad');
      expect(autoSubmitCheckbox.checked).toBe(false);
      expect(autoSubmitCheckbox.dispatchEvent).not.toHaveBeenCalled();
      expect(readStoredOrElementValue(textInput)).toBe('');
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

  it('releases capture even when event lacks preventDefault', () => {
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
    globalThis.requestAnimationFrame = jest.fn(() => 21);
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = { getGamepads: jest.fn(() => []) };

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];
      button._listeners.click();

      globals.listeners.keydown({
        type: 'keydown',
        key: 'Escape',
      });

      expect(button.textContent).toBe('Capture gamepad');
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(21);
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

  it('does not cancel a second time when the form is disposed after release', () => {
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
    globalThis.requestAnimationFrame = jest.fn(() => 11);
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.navigator = { getGamepads: jest.fn(() => []) };

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const form = container._children[0];
      const button = form._children[0];

      button._listeners.click();
      globals.listeners.keydown({
        type: 'keydown',
        key: 'Escape',
        preventDefault: jest.fn(),
      });

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledTimes(1);
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(11);

      form._dispose();

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledTimes(1);
      expect(globalThis.removeEventListener).toHaveBeenNthCalledWith(
        1,
        'keydown',
        expect.any(Function)
      );
      expect(globalThis.removeEventListener).toHaveBeenNthCalledWith(
        2,
        'gamepadconnected',
        expect.any(Function)
      );
      expect(globalThis.removeEventListener).toHaveBeenNthCalledWith(
        3,
        'gamepaddisconnected',
        expect.any(Function)
      );
      expect(dom.removeEventListener).toHaveBeenCalledWith(
        button,
        'click',
        expect.any(Function)
      );
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      globalThis.navigator = previousNavigator;
    }
  });

  it('stops requeueing poll frames once capture ends before the queued frame runs', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };
    const globals = createGlobalListenerRegistry();
    const frames = [];
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
      getGamepads: jest.fn(() => [createGamepad()]),
    };

    try {
      gamepadCaptureHandler(dom, container, textInput);
      const button = container._children[0]._children[0];

      button._listeners.click();
      expect(frames).toHaveLength(1);

      button._listeners.click();
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(1);
      expect(frames).toHaveLength(1);

      frames[0]();
      expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.addEventListener = previousAdd;
      globalThis.removeEventListener = previousRemove;
      globalThis.requestAnimationFrame = previousRequestAnimationFrame;
      globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
      globalThis.navigator = previousNavigator;
    }
  });
});
