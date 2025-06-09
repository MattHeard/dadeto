import { describe, it, expect, jest } from '@jest/globals';
import { createHandleSubmit } from '../../src/browser/toys.js';

// Additional test to ensure createHandleSubmit returns a working handler
// for multiple invocations. This helps catch mutants that replace the
// function with a no-op.

describe('createHandleSubmit multiple calls', () => {
  it('invokes dom.stopDefault and processingFunction for every call', () => {
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
      fetchFn: jest.fn(() =>
        Promise.resolve({ text: jest.fn(() => Promise.resolve('body')) })
      ),
    };
    const elements = {
      inputElement: { value: 'v' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const processingFunction = jest.fn(() => 'result');

    const handler = createHandleSubmit(elements, processingFunction, env);
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);

    const firstEvt = {};
    const secondEvt = {};
    handler(firstEvt);
    handler(secondEvt);

    expect(dom.stopDefault).toHaveBeenNthCalledWith(1, firstEvt);
    expect(dom.stopDefault).toHaveBeenNthCalledWith(2, secondEvt);
    expect(processingFunction).toHaveBeenNthCalledWith(1, 'v', expect.any(Map));
    expect(processingFunction).toHaveBeenNthCalledWith(2, 'v', expect.any(Map));
  });
});
