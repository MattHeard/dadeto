import { describe, it, expect, jest } from '@jest/globals';

// Dynamically import initializeInteractiveComponent within the test so
// coverage is correctly attributed.
describe('initializeInteractiveComponent dynamic import', () => {
  it('enables controls for the provided elements', async () => {
    const { initializeInteractiveComponent } = await import(
      '../../src/browser/toys.js'
    );
    const inputElement = {};
    const submitButton = {};
    const outputParent = {};
    const querySelector = jest.fn((_, selector) => {
      if (selector === 'input[type="text"]') {
        return inputElement;
      }
      if (selector === 'button[type="submit"]') {
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

    expect(dom.enable).toHaveBeenCalledWith(inputElement);
    expect(dom.enable).toHaveBeenCalledWith(submitButton);
  });

  it('sets an initializing message in the output', async () => {
    const { initializeInteractiveComponent } = await import(
      '../../src/browser/toys.js'
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
      querySelector: jest.fn(() => ({})),
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
    const article = { id: 'post' };
    const processingFunction = jest.fn();

    initializeInteractiveComponent(article, processingFunction, config);

    expect(dom.setTextContent.mock.calls[0][1]).toBe('Initialising...');
  });
});
