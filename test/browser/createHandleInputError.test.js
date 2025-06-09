import { describe, it, expect, jest } from '@jest/globals';
import { createHandleSubmit } from '../../src/browser/toys.js';

describe('createHandleSubmit error handling via createHandleInputError', () => {
  it('logs and warns when processing function throws', () => {
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
      errorFn: jest.fn(),
      dom,
      createEnv: jest.fn(() => ({})),
      fetchFn: jest.fn(),
    };

    const elements = {
      inputElement: { value: '' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'art' },
    };

    const processingFunction = jest.fn(() => {
      throw new Error('boom');
    });

    const handler = createHandleSubmit(elements, processingFunction, env);

    let result;
    expect(() => {
      result = handler({});
    }).not.toThrow();
    expect(result).toBeUndefined();

    expect(env.errorFn).toHaveBeenCalledWith(
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
