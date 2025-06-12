import { describe, it, expect, jest } from '@jest/globals';
import { initializeInteractiveComponent } from '../../src/browser/toys.js';

describe('initializeInteractiveComponent', () => {
  it('enables controls using enableInteractiveControls', () => {
    const inputElement = {};
    const submitButton = {};
    const outputParent = {};
    const dom = {
      querySelector: jest.fn((_, selector) => {
        if (selector === 'input[type="text"]') {return inputElement;}
        if (selector === 'button[type="submit"]') {return submitButton;}
        if (selector === 'div.output') {return outputParent;}
        if (selector === 'select.output') {return {};}
        return {};
      }),
      addEventListener: jest.fn(),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({ textContent: '' })),
      appendChild: jest.fn(),
      setTextContent: jest.fn(),
      removeWarning: jest.fn(),
      enable: jest.fn(),
      stopDefault: jest.fn(),
      removeChild: jest.fn(),
      addWarning: jest.fn(),
      contains: () => true,
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
    const processingFunction = jest.fn();

    initializeInteractiveComponent({}, processingFunction, config);

    expect(dom.enable).toHaveBeenCalledWith(inputElement);
    expect(dom.enable).toHaveBeenCalledWith(submitButton);
    expect(dom.removeWarning).toHaveBeenCalledWith(outputParent);
  });
});
