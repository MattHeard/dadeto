import { describe, expect, it, jest } from '@jest/globals';
import { joyConMapperHandler } from '../../../src/core/browser/inputHandlers/joyConMapper.js';
import { readStoredOrElementValue } from '../../../src/core/browser/inputValueStore.js';

/**
 * Create a minimal test element stub.
 * @param {string} tag Element tag name.
 * @returns {Record<string, unknown>} Element stub used by the DOM mock.
 */
function makeElement(tag = 'div') {
  return {
    tag,
    _children: [],
    classList: { add: jest.fn(), toggle: jest.fn() },
    dispatchEvent: jest.fn(),
  };
}

/**
 * Build a DOM helper mock for the mapper handler tests.
 * @param {Record<string, unknown>} autoSubmitCheckbox Auto-submit checkbox stub.
 * @returns {Record<string, unknown>} DOM helper mock.
 */
function makeDom(autoSubmitCheckbox) {
  return {
    globalThis,
    getGamepads: jest.fn(() => []),
    requestAnimationFrame: callback =>
      globalThis.requestAnimationFrame(callback),
    setInterval: (callback, delay) => globalThis.setInterval(callback, delay),
    clearInterval: handle => globalThis.clearInterval(handle),
    createElement: jest.fn(tag => makeElement(tag)),
    setClassName: jest.fn((el, cls) => {
      el.className = cls;
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
    removeChild: jest.fn(),
    removeAllChildren: jest.fn(parent => {
      parent._children = [];
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
  };
}

/**
 * Find a nested stub element by text content.
 * @param {Record<string, unknown> | null | undefined} root Root node to search.
 * @param {string} text Text to match.
 * @returns {Record<string, unknown> | null} Matching stub node, if present.
 */
function findByText(root, text) {
  if (root?.textContent === text) {
    return root;
  }
  for (const child of root?._children ?? []) {
    const found = findByText(child, text);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Build a gamepad snapshot stub for tests.
 * @param {{ axes?: number[], buttons?: Array<{ pressed: boolean, value: number }>, connected?: boolean, id?: string, index?: number, mapping?: string, timestamp?: number }} [overrides] Snapshot overrides.
 * @returns {Gamepad} Gamepad stub.
 */
function createGamepad(overrides = {}) {
  return /** @type {Gamepad} */ ({
    axes: overrides.axes ?? [0, 0],
    buttons: overrides.buttons ?? [
      { pressed: false, value: 0 },
      { pressed: false, value: 0 },
    ],
    connected: overrides.connected ?? true,
    id: overrides.id ?? 'Nintendo Joy-Con (L)',
    index: overrides.index ?? 0,
    mapping: overrides.mapping ?? 'standard',
    timestamp: overrides.timestamp ?? 1,
  });
}

describe('joyConMapperHandler', () => {
  it('renders mapper UI and emits initialize payload on start', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };

    const previousRaf = globalThis.requestAnimationFrame;
    const previousCaf = globalThis.cancelAnimationFrame;
    const previousSetInterval = globalThis.setInterval;
    const previousClearInterval = globalThis.clearInterval;

    globalThis.requestAnimationFrame = jest.fn(callback => {
      callback();
      return 1;
    });
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.setInterval = jest.fn(callback => {
      callback();
      return 2;
    });
    globalThis.clearInterval = jest.fn();

    try {
      joyConMapperHandler(dom, container, textInput);

      const form = container._children[0];
      const startButton = findByText(form, 'Start Mapping');
      expect(startButton).not.toBeNull();

      startButton._listeners.click();

      const payload = JSON.parse(readStoredOrElementValue(textInput));
      expect(payload).toBeTruthy();
      expect(autoSubmitCheckbox.checked).toBe(true);
      expect(autoSubmitCheckbox.dispatchEvent).toHaveBeenCalled();
    } finally {
      globalThis.requestAnimationFrame = previousRaf;
      globalThis.cancelAnimationFrame = previousCaf;
      globalThis.setInterval = previousSetInterval;
      globalThis.clearInterval = previousClearInterval;
    }
  });

  it('handles missing article wrappers by skipping the auto-submit checkbox lookup', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => null),
    };
    const textInput = { value: '' };

    const previousRaf = globalThis.requestAnimationFrame;
    const previousCaf = globalThis.cancelAnimationFrame;
    const previousSetInterval = globalThis.setInterval;
    const previousClearInterval = globalThis.clearInterval;

    globalThis.requestAnimationFrame = jest.fn(callback => {
      callback();
      return 1;
    });
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.setInterval = jest.fn(callback => {
      callback();
      return 2;
    });
    globalThis.clearInterval = jest.fn();

    try {
      joyConMapperHandler(dom, container, textInput);

      const form = container._children[0];
      const startButton = findByText(form, 'Start Mapping');
      expect(startButton).not.toBeNull();
      expect(dom.querySelector).not.toHaveBeenCalled();
      expect(autoSubmitCheckbox.checked).toBe(false);

      startButton._listeners.click();

      const payload = JSON.parse(readStoredOrElementValue(textInput));
      expect(payload).toBeTruthy();
      expect(autoSubmitCheckbox.checked).toBe(false);
      expect(autoSubmitCheckbox.dispatchEvent).not.toHaveBeenCalled();
    } finally {
      globalThis.requestAnimationFrame = previousRaf;
      globalThis.cancelAnimationFrame = previousCaf;
      globalThis.setInterval = previousSetInterval;
      globalThis.clearInterval = previousClearInterval;
    }
  });

  it('renders default state when no gamepads are connected', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };

    const previousRaf = globalThis.requestAnimationFrame;
    const previousCaf = globalThis.cancelAnimationFrame;
    const previousSetInterval = globalThis.setInterval;
    const previousClearInterval = globalThis.clearInterval;

    globalThis.requestAnimationFrame = jest.fn(callback => {
      callback();
      return 1;
    });
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.setInterval = jest.fn(callback => {
      callback();
      return 2;
    });
    globalThis.clearInterval = jest.fn();

    try {
      joyConMapperHandler(dom, container, textInput);

      const form = container._children[0];
      expect(findByText(form, 'Waiting for gamepad')).not.toBeNull();
      expect(findByText(form, 'Index: -')).not.toBeNull();
      expect(findByText(form, 'ID: -')).not.toBeNull();
    } finally {
      globalThis.requestAnimationFrame = previousRaf;
      globalThis.cancelAnimationFrame = previousCaf;
      globalThis.setInterval = previousSetInterval;
      globalThis.clearInterval = previousClearInterval;
    }
  });

  it('renders connected gamepad details when a gamepad is already present', () => {
    const autoSubmitCheckbox = { checked: false, dispatchEvent: jest.fn() };
    const dom = makeDom(autoSubmitCheckbox);
    dom.getGamepads.mockReturnValue([createGamepad()]);
    const container = {
      _children: [],
      closest: jest.fn(() => ({ id: 'article-1' })),
    };
    const textInput = { value: '' };

    const previousRaf = globalThis.requestAnimationFrame;
    const previousCaf = globalThis.cancelAnimationFrame;
    const previousSetInterval = globalThis.setInterval;
    const previousClearInterval = globalThis.clearInterval;

    globalThis.requestAnimationFrame = jest.fn(callback => {
      callback();
      return 1;
    });
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.setInterval = jest.fn(callback => {
      callback();
      return 2;
    });
    globalThis.clearInterval = jest.fn();

    try {
      joyConMapperHandler(dom, container, textInput);

      const form = container._children[0];
      expect(findByText(form, 'Gamepad detected')).not.toBeNull();
      expect(findByText(form, 'Index: 0')).not.toBeNull();
      expect(findByText(form, 'ID: Nintendo Joy-Con (L)')).not.toBeNull();
      expect(
        findByText(
          form,
          'Press Start Mapping. Every control is optional and can be skipped.'
        )
      ).not.toBeNull();
    } finally {
      globalThis.requestAnimationFrame = previousRaf;
      globalThis.cancelAnimationFrame = previousCaf;
      globalThis.setInterval = previousSetInterval;
      globalThis.clearInterval = previousClearInterval;
    }
  });
});
