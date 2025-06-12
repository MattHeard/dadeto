import { describe, it, expect, jest } from '@jest/globals';
import { getModuleInitializer } from '../../src/browser/toys.js';

describe('getModuleInitializer', () => {
  it('invokes the module function when submit button handler is triggered', () => {
    const article = { id: 'a1' };
    const inputElement = { value: 'in', disabled: false };
    const submitButton = {};
    const outputParent = {};
    const outputSelect = { value: 'text' };
    const handlers = {};
    const dom = {
      querySelector: jest.fn((el, selector) => {
        switch (selector) {
        case 'input[type="text"]':
          return inputElement;
        case 'button[type="submit"]':
          return submitButton;
        case 'div.output':
          return outputParent;
        case 'select.output':
          return outputSelect;
        default:
          return null;
        }
      }),
      addEventListener: jest.fn((el, event, handler) => {
        handlers[event] = handler;
      }),
      stopDefault: jest.fn(),
      getNextSibling: jest.fn(() => null),
      addWarning: jest.fn(),
      enable: jest.fn(),
      removeWarning: jest.fn(),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({ textContent: '' })),
      appendChild: jest.fn(),
      setType: jest.fn(),
      setValue: jest.fn(),
      setTextContent: jest.fn(),
    };
    const config = {
      globalState: {},
      createEnvFn: () => ({ get: () => () => {}, set: () => {} }),
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
      dom,
      loggers: {
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
    };
    const modFn = jest.fn();
    const module = { process: modFn };
    const initializer = getModuleInitializer(article, 'process', config);

    initializer(module);
    handlers.click({});

    expect(modFn).toHaveBeenCalled();
  });
});
