import { describe, it, expect, jest } from '@jest/globals';
import { getModuleInitializer } from '../../src/browser/toys.js';

describe('getModuleInitializer', () => {
  it('invokes module function when submit handler runs', () => {
    const article = { id: 'a' };
    const functionName = 'process';
    const moduleFn = jest.fn(() => 'res');
    const module = { [functionName]: moduleFn };

    const inputElement = { value: 'input', disabled: false };
    const submitButton = { disabled: false };
    const outputParent = {};
    const outputSelect = { value: 'text' };
    const paragraph = {};

    const querySelector = jest.fn((el, selector) => {
      switch (selector) {
      case 'input[type="text"]':
        return inputElement;
      case 'button[type="submit"]':
        return submitButton;
      case 'div.output > p':
        return paragraph;
      case 'div.output':
        return outputParent;
      case 'select.output':
        return outputSelect;
      default:
        return {};
      }
    });

    let clickHandler;
    const dom = {
      querySelector,
      addEventListener: jest.fn((el, event, handler) => {
        if (el === submitButton && event === 'click') {
          clickHandler = handler;
        }
      }),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => paragraph),
      setTextContent: jest.fn(() => paragraph),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      enable: jest.fn(),
      removeWarning: jest.fn(),
      addWarning: jest.fn(),
      stopDefault: jest.fn(),
      contains: jest.fn(() => true),
      getValue: jest.fn(() => inputElement.value),
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

    const initializer = getModuleInitializer(article, functionName, config);
    initializer(module);

    clickHandler({ preventDefault: jest.fn() });

    expect(moduleFn).toHaveBeenCalledWith('input', expect.any(Object));
  });
});
