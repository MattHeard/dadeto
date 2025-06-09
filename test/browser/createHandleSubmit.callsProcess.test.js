import { describe, it, expect, jest } from '@jest/globals';
import { createHandleSubmit } from '../../src/browser/toys.js';

describe('createHandleSubmit fetch usage', () => {
  it('does not call fetchFn when processingFunction returns plain data', () => {
    const fetchFn = jest.fn();
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
      fetchFn,
    };
    const elements = {
      inputElement: { value: 'x' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };
    const processingFunction = jest.fn(() => 'result');

    const handler = createHandleSubmit(elements, processingFunction, env);
    const event = {};
    const result = handler(event);

    expect(result).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(dom.stopDefault).toHaveBeenCalledWith(event);
    expect(processingFunction).toHaveBeenCalledWith('x', expect.any(Map));
  });
});
