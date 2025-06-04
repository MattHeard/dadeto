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

    const processingFunction = jest.fn(() => {
      throw new Error('boom');
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
  });
});
