import { describe, it, expect, jest } from '@jest/globals';
import { initializeInteractiveComponent } from '../../src/browser/toys.js';

describe('initializeInteractiveComponent missing elements', () => {
  it('logs warning and exits when input or button not found', () => {
    const dom = {
      querySelector: jest.fn(() => null),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({ textContent: '' })),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeWarning: jest.fn(),
      enable: jest.fn(),
      stopDefault: jest.fn(),
      removeChild: jest.fn(),
      addWarning: jest.fn(),
      appendChild: jest.fn(),
      contains: () => true,
    };
    const logWarning = jest.fn();
    const config = {
      globalState: {},
      createEnvFn: () => ({}),
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
      dom,
      loggers: { logInfo: jest.fn(), logError: jest.fn(), logWarning },
    };
    const article = { id: 'missing' };
    const processingFunction = jest.fn();

    initializeInteractiveComponent(article, processingFunction, config);

    expect(logWarning).toHaveBeenCalledWith(
      'Interactive component missing input or button in article',
      article.id
    );
    expect(dom.addEventListener).not.toHaveBeenCalled();
    expect(dom.enable).not.toHaveBeenCalled();
  });

  it('logs warning when input element is missing but button exists', () => {
    const dom = {
      querySelector: jest.fn((_, selector) =>
        selector === 'input[type="text"]' ? null : {}
      ),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({ textContent: '' })),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeWarning: jest.fn(),
      enable: jest.fn(),
      stopDefault: jest.fn(),
      removeChild: jest.fn(),
      addWarning: jest.fn(),
      appendChild: jest.fn(),
      contains: () => true,
    };
    const logWarning = jest.fn();
    const config = {
      globalState: {},
      createEnvFn: () => ({}),
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
      dom,
      loggers: { logInfo: jest.fn(), logError: jest.fn(), logWarning },
    };
    const article = { id: 'missing-input' };
    const processingFunction = jest.fn();

    initializeInteractiveComponent(article, processingFunction, config);

    expect(logWarning).toHaveBeenCalledWith(
      'Interactive component missing input or button in article',
      article.id
    );
    expect(dom.addEventListener).not.toHaveBeenCalled();
    expect(dom.enable).not.toHaveBeenCalled();
  });

  it('logs warning when button is missing but input element exists', () => {
    const dom = {
      querySelector: jest.fn((_, selector) =>
        selector === 'button[type="submit"]' ? null : {}
      ),
      removeAllChildren: jest.fn(),
      createElement: jest.fn(() => ({ textContent: '' })),
      setTextContent: jest.fn(),
      addEventListener: jest.fn(),
      removeWarning: jest.fn(),
      enable: jest.fn(),
      stopDefault: jest.fn(),
      removeChild: jest.fn(),
      addWarning: jest.fn(),
      appendChild: jest.fn(),
      contains: () => true,
    };
    const logWarning = jest.fn();
    const config = {
      globalState: {},
      createEnvFn: () => ({}),
      errorFn: jest.fn(),
      fetchFn: jest.fn(),
      dom,
      loggers: { logInfo: jest.fn(), logError: jest.fn(), logWarning },
    };
    const article = { id: 'missing-button' };
    const processingFunction = jest.fn();

    initializeInteractiveComponent(article, processingFunction, config);

    expect(logWarning).toHaveBeenCalledWith(
      'Interactive component missing input or button in article',
      article.id
    );
    expect(dom.addEventListener).not.toHaveBeenCalled();
    expect(dom.enable).not.toHaveBeenCalled();
  });
});
