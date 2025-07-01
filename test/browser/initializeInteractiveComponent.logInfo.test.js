import { describe, it, expect, jest } from '@jest/globals';

// Dynamically import the module to ensure Stryker tracks coverage correctly

describe('initializeInteractiveComponent logging', () => {
  it('logs the input and button elements when found', async () => {
    const { initializeInteractiveComponent } = await import(
      '../../src/browser/toys.js'
    );

    const inputElement = {};
    const submitButton = {};
    const outputParent = {};
    const outputSelect = {};
    const logInfo = jest.fn();

    const queryElements = {
      'input[type="text"]': inputElement,
      'button[type="submit"]': submitButton,
      'div.output': outputParent,
      'select.output': outputSelect,
    };
    const querySelector = jest.fn(
      (_, selector) => queryElements[selector] ?? {}
    );

    const dom = {
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({ textContent: '' })),
      setTextContent: jest.fn(),
      stopDefault: jest.fn(),
      addWarning: jest.fn(),
      addWarningFn: jest.fn(),
      addEventListener: jest.fn(),
      removeChild: jest.fn(),
      appendChild: jest.fn(),
      querySelector,
      removeWarning: jest.fn(),
      enable: jest.fn(),
      contains: () => true,
    };

    const config = {
      globalState: {},
      createEnvFn: () => ({}),
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
      dom,
      loggers: {
        logInfo,
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
    };

    const article = { id: 'post' };
    const processingFunction = jest.fn();

    initializeInteractiveComponent(article, processingFunction, config);

    expect(logInfo).toHaveBeenCalledWith('Found input element:', inputElement);
    expect(logInfo).toHaveBeenCalledWith('Found button element:', submitButton);
  });
});
