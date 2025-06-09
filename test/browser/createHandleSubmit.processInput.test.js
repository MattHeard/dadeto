import { describe, it, expect, jest } from '@jest/globals';
import { createHandleSubmit } from '../../src/browser/toys.js';

describe('createHandleSubmit integration', () => {
  it('invokes dom.stopDefault and processingFunction', () => {
    const elements = {
      inputElement: { value: 'x' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'POST1' },
    };
    const processingFunction = jest.fn();
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

    const handler = createHandleSubmit(elements, processingFunction, env);
    const event = {};
    handler(event);

    expect(dom.stopDefault).toHaveBeenCalledWith(event);
    expect(processingFunction).toHaveBeenCalledWith('x', expect.any(Map));
  });
});
