import { describe, it, expect, jest } from '@jest/globals';
import { createHandleSubmit } from '../../src/browser/toys.js';

describe('createHandleSubmit string representation', () => {
  it('includes stopDefault call in the returned handler', () => {
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
      createEnv: jest.fn(
        () =>
          new Map([
            ['getData', jest.fn()],
            ['setData', jest.fn()],
          ])
      ),
      errorFn: jest.fn(),
      fetchFn: jest.fn(() =>
        Promise.resolve({ text: jest.fn(() => Promise.resolve('')) })
      ),
    };
    const elements = {
      inputElement: { value: '' },
      outputParentElement: {},
      outputSelect: { value: 'text' },
      article: { id: 'a1' },
    };

    const handler = createHandleSubmit(
      elements,
      jest.fn(() => ''),
      env
    );
    expect(typeof handler).toBe('function');
    expect(handler.length).toBe(1);
    expect(handler.toString()).toContain('stopDefault');
    // Additional assertion to help eliminate mutation that removes
    // the handleInputProcessing call within the handler
    expect(handler.toString()).toContain('handleInputProcessing');
  });
});
