import { describe, it, expect, jest } from '@jest/globals';
import { initializeInteractiveComponent } from '../../src/browser/toys.js';

describe('initializeInteractiveComponent', () => {
  it('logs initialization message with article id', () => {
    const inputElement = {};
    const submitButton = {};
    const outputParent = {};
    const querySelector = jest.fn((_, selector) => {
      if (selector === 'input') {
        return inputElement;
      }
      if (selector === 'button') {
        return submitButton;
      }
      if (selector === 'div.output') {
        return outputParent;
      }
      if (selector === 'select.output') {
        return {};
      }
      return {};
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
    const initCalls = logInfo.mock.calls.filter(
      call =>
        call[0] === `[${article.id}]` &&
        call[1] === 'Initializing interactive component for article'
    );
    expect(initCalls.length).toBe(1);
    expect(initCalls[0][2]).toBe(article.id);
  });
});
