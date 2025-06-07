import { jest } from '@jest/globals';
import { createHandleSubmit } from '../../src/browser/toys.js';

describe('createHandleSubmit', () => {
  it('should handle being called without arguments', () => {
    // This test verifies that the function can be called without throwing
    expect(() => {
      createHandleSubmit();
    }).not.toThrow();
  });

  it('handles errors from the processing function', () => {
    const errorFn = jest.fn();
    const addWarning = jest.fn();
    const stopDefault = jest.fn();
    const removeAllChildren = jest.fn();
    const appendChild = jest.fn();
    const createElement = jest.fn(() => ({}));
    const setTextContent = jest.fn();

    const dom = {
      stopDefault,
      addWarning,
      removeAllChildren,
      appendChild,
      createElement,
      setTextContent,
    };

    const env = {
      errorFn,
      dom,
      createEnv: jest.fn(() => ({})),
      fetchFn: jest.fn(),
    };

    const elements = {
      inputElement: { value: '' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };

    const processingError = new Error('boom');
    const processingFunction = jest.fn(() => {
      throw processingError;
    });

    const handler = createHandleSubmit(elements, processingFunction, env);
    const event = {};

    handler(event);

    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(errorFn).toHaveBeenCalledWith(
      'Error processing input:',
      expect.any(Error)
    );
    expect(addWarning).toHaveBeenCalledWith(elements.outputParentElement);
    expect(removeAllChildren).toHaveBeenCalledWith(
      elements.outputParentElement
    );
    expect(appendChild).toHaveBeenCalled();
    expect(setTextContent).toHaveBeenCalledWith(
      expect.anything(),
      'Error: ' + processingError.message
    );
  });

  it('returns a handler that stops default behaviour', () => {
    const stopDefault = jest.fn();
    const dom = {
      stopDefault,
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      addWarning: jest.fn(),
    };
    const toyEnv = new Map([
      ['getData', () => ({ output: {} })],
      ['setData', jest.fn()],
    ]);
    const env = {
      dom,
      createEnv: jest.fn(() => toyEnv),
      errorFn: jest.fn(),
      fetchFn: jest.fn(() =>
        Promise.resolve({ text: jest.fn(() => Promise.resolve('body')) })
      ),
    };
    const elements = {
      inputElement: { value: '' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const json = '{"request":{"url":"https://example.com"}}';
    const processingFunction = jest.fn(() => json);

    const handler = createHandleSubmit(elements, processingFunction, env);

    expect(typeof handler).toBe('function');

    const event = {};
    handler(event);

    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(processingFunction).toHaveBeenCalledWith('', toyEnv);
  });
});
