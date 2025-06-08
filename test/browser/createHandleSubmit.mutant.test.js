import { describe, it, expect, jest } from '@jest/globals';
import { createHandleSubmit } from '../../src/browser/toys.js';

describe('createHandleSubmit mutant killer', () => {
  it('returns a handler that stops default and processes input', () => {
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

    const evt = {};
    const result = handler(evt);

    expect(result).toBeUndefined();
    expect(dom.stopDefault).toHaveBeenCalledWith(evt);
    expect(processingFunction).toHaveBeenCalledWith('v', expect.any(Map));
  });
});
