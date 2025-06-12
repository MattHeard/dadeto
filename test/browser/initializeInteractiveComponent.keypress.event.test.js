import { describe, it, expect, jest } from '@jest/globals';
import { initializeInteractiveComponent } from '../../src/browser/toys.js';

describe('initializeInteractiveComponent keypress event object', () => {
  it('forwards the keypress event to handleSubmit when Enter is pressed', () => {
    const inputElement = {};
    const submitButton = {};
    const outputParent = {};
    const outputSelect = {};
    let keypressHandler;

    const dom = {
      querySelector: jest.fn((_, selector) => {
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
          return {};
        }
      }),
      addEventListener: jest.fn((el, event, handler) => {
        if (el === inputElement && event === 'keypress') {
          keypressHandler = handler;
        }
      }),
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

    const handleSubmit = jest.fn();
    const processingFunction = jest.fn(() => handleSubmit);
    const config = {
      globalState: {},
      createEnvFn: () => ({}),
      errorFn: jest.fn(),
      fetchFn: jest.fn().mockResolvedValue({ text: jest.fn().mockResolvedValue('{}') }),
      dom,
      loggers: { logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() },
    };
    const article = { id: 'article-2' };

    initializeInteractiveComponent(article, processingFunction, config);

    const evt = { key: 'Enter' };
    keypressHandler(evt);
    expect(dom.stopDefault).toHaveBeenCalledWith(evt);
  });
});
