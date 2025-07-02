import { describe, it, expect, jest } from '@jest/globals';
import { initializeInteractiveComponent } from '../../src/browser/toys.js';

// Test that the keypress handler created inside initializeInteractiveComponent
// triggers submit only when the Enter key is pressed.
describe('initializeInteractiveComponent keypress handling', () => {
  it('invokes handleSubmit on Enter key only', () => {
    const inputElement = {};
    const submitButton = {};
    const outputParent = {};
    const outputSelect = {};
    let keypressHandler;

    const dom = {
      querySelector: jest.fn(
        (_, selector) =>
          ({
            'input[type="text"]': inputElement,
            'button[type="submit"]': submitButton,
            'div.output': outputParent,
            'select.output': outputSelect,
          })[selector] || {}
      ),
      addEventListener: jest.fn((_, __, handler) => {
        keypressHandler = handler;
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

    const config = {
      globalState: {},
      createEnvFn: () => ({}),
      errorFn: jest.fn(),
      fetchFn: jest
        .fn()
        .mockResolvedValue({ text: jest.fn().mockResolvedValue('{}') }),
      dom,
      loggers: {
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
    };
    const processingFunction = jest.fn();
    const article = { id: 'article-1' };

    initializeInteractiveComponent(article, processingFunction, config);

    expect(typeof keypressHandler).toBe('function');

    // Non-Enter key should not trigger submit
    keypressHandler({ key: 'a' });
    expect(dom.stopDefault).not.toHaveBeenCalled();

    // Enter key triggers submit and forwards the event object
    const evt = { key: 'Enter' };
    keypressHandler(evt);
    expect(dom.stopDefault).toHaveBeenCalledTimes(1);
    expect(dom.stopDefault).toHaveBeenCalledWith(evt);
  });
});
