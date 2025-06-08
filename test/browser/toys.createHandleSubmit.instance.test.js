import { describe, it, expect, jest } from '@jest/globals';
import { createHandleSubmit } from '../../src/browser/toys.js';

describe('createHandleSubmit instances', () => {
  it('returns a new handler function on each invocation', () => {
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
      inputElement: { value: '' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const processingFunction = jest.fn(() => 'result');
    const handler1 = createHandleSubmit(elements, processingFunction, env);
    const handler2 = createHandleSubmit(elements, processingFunction, env);
    expect(typeof handler1).toBe('function');
    expect(typeof handler2).toBe('function');
    expect(handler1).not.toBe(handler2);
    const evt = {};
    handler1(evt);
    handler2(evt);
    expect(dom.stopDefault).toHaveBeenCalledTimes(2);
  });
});
