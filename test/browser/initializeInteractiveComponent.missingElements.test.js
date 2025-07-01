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

  it('handles missing input element but existing button', () => {
    const button = {};
    const dom = {
      querySelector: jest.fn((_, selector) => {
        const elements = {
          'input[type="text"]': null,
          'button[type="submit"]': button,
        };
        if (Object.prototype.hasOwnProperty.call(elements, selector)) {
          return elements[selector];
        }
        return {};
      }),
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

  it('handles missing button element but existing input', () => {
    const input = {};
    const dom = {
      querySelector: jest.fn((_, selector) => {
        const elements = {
          'input[type="text"]': input,
          'button[type="submit"]': null,
        };
        if (Object.prototype.hasOwnProperty.call(elements, selector)) {
          return elements[selector];
        }
        return {};
      }),
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
