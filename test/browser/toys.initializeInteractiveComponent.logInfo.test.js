import { describe, it, expect, jest } from '@jest/globals';
import { initializeInteractiveComponent } from '../../src/browser/toys.js';

describe('initializeInteractiveComponent', () => {
  it('logs initialization message with article id', () => {
    const inputElement = {};
    const submitButton = {};
    const outputParent = {};
    const querySelector = jest.fn((_, selector) => {
      const map = {
        'input[type="text"]': inputElement,
        'button[type="submit"]': submitButton,
        'div.output': outputParent,
        'select.output': {},
      };
      return map[selector] ?? {};
    });
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
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
      },
    };
    const article = { id: 'article-1' };
    const processingFunction = jest.fn();

    initializeInteractiveComponent(article, processingFunction, config);

    const { logInfo } = config.loggers;
    expect(logInfo).toHaveBeenCalledWith(
      'Initializing interactive component for article',
      article.id
    );

    // Ensure this specific call happens exactly once
    const isSpecificCall = ([text, id]) =>
      text === 'Initializing interactive component for article' &&
      id === article.id;
    const specificCalls = logInfo.mock.calls.filter(isSpecificCall);
    expect(specificCalls.length).toBe(1);
  });
});
