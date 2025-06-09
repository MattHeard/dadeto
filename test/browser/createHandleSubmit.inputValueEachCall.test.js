import { describe, it, expect, jest } from '@jest/globals';
import { createHandleSubmit } from '../../src/browser/toys.js';

describe('createHandleSubmit input value', () => {
  it('reads the input value on each invocation', () => {
    const dom = {
      stopDefault: jest.fn(),
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent: jest.fn(),
      addWarning: jest.fn(),
    };
    const env = {
      dom,
      createEnv: jest.fn(() => new Map()),
      errorFn: jest.fn(),
      fetchFn: jest.fn(() => Promise.resolve({ text: jest.fn() })),
    };
    const elements = {
      inputElement: { value: 'a' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const processingFunction = jest.fn();

    const handler = createHandleSubmit(elements, processingFunction, env);
    handler({});
    elements.inputElement.value = 'b';
    handler({});

    expect(processingFunction).toHaveBeenNthCalledWith(1, 'a', expect.any(Map));
    expect(processingFunction).toHaveBeenNthCalledWith(2, 'b', expect.any(Map));
  });
});
