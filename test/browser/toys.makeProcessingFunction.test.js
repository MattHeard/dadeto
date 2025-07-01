import { jest, describe, it, expect } from '@jest/globals';
import { getModuleInitializer } from '../../src/browser/toys.js';

describe('getModuleInitializer makeProcessingFunction integration', () => {
  it("uses the module's exported function when events fire", () => {
    const article = { id: 'a' };
    const inputEl = { value: 'val', disabled: false };
    const buttonEl = {};
    const outputParent = {};
    const outputSelect = { value: 'text' };
    const dom = {
      querySelector: jest.fn((el, selector) => {
        const elements = {
          'input[type="text"]': inputEl,
          'button[type="submit"]': buttonEl,
          'div.output': outputParent,
          'select.output': outputSelect,
        };
        return elements[selector] || null;
      }),
      addEventListener: jest.fn(),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({ textContent: '' })),
      appendChild: jest.fn(),
      stopDefault: jest.fn(),
      addWarning: jest.fn(),
      enable: jest.fn(),
      removeWarning: jest.fn(),
      setTextContent: jest.fn(),
    };
    const config = {
      globalState: {},
      createEnvFn: () => ({}),
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
      dom,
      loggers: {
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
    };
    const moduleFn = jest.fn();
    const module = { process: moduleFn };
    const initializer = getModuleInitializer(article, 'process', config);

    const listeners = {};
    dom.addEventListener.mockImplementation((el, evt, handler) => {
      listeners[evt] = handler;
    });

    initializer(module);
    listeners.click({});

    expect(moduleFn).toHaveBeenCalledWith('val', expect.any(Object));
  });
});
