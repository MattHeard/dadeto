import { describe, it, expect, jest } from '@jest/globals';
import { getModuleInitializer } from '../../src/browser/toys.js';

describe('getModuleInitializer minimal invoke', () => {
  it('calls the module function when submit is clicked', () => {
    const article = { id: 'a1' };
    const functionName = 'process';
    const inputElement = { value: 'in', disabled: false };
    const submitButton = {};
    const outputParent = {};
    const outputSelect = { value: 'text' };
    const paragraph = {};
    const handlers = {};
    const selectorMap = new Map([
      ['input', inputElement],
      ['button', submitButton],
      ['div.output', outputParent],
      ['div.output > p', paragraph],
      ['select.output', outputSelect],
    ]);
    const dom = {
      querySelector: jest.fn((el, selector) => selectorMap.get(selector)),
      addEventListener: jest.fn((el, event, handler) => {
        if (el === submitButton && event === 'click') {
          handlers.click = handler;
        }
      }),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => paragraph),
      appendChild: jest.fn(),
      setTextContent: jest.fn(),
      removeWarning: jest.fn(),
      enable: jest.fn(),
      stopDefault: jest.fn(),
      getNextSibling: jest.fn(() => null),
      addWarning: jest.fn(),
      contains: jest.fn(() => true),
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
    const moduleFn = jest.fn(() => 'res');
    const module = { [functionName]: moduleFn };

    const initializer = getModuleInitializer(article, functionName, config);
    initializer(module);

    handlers.click({ preventDefault: jest.fn() });

    expect(moduleFn).toHaveBeenCalledWith('in', expect.any(Object));
  });
});
