import { describe, it, expect, jest } from '@jest/globals';
import { createNumberInput } from '../../src/core/inputHandlers/number.js';

describe('createNumberInput disposer', () => {
  it('removes the input event listener when _dispose is called', () => {
    const mockInput = {};
    const onChange = jest.fn();
    let handler;
    const dom = {
      createElement: jest.fn(() => mockInput),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn((el, event, h) => {
        if (event === 'input') {
          handler = h;
        }
      }),
      removeEventListener: jest.fn(),
    };

    const input = createNumberInput('1', onChange, dom);

    expect(typeof input._dispose).toBe('function');
    dom.removeEventListener.mockClear();
    input._dispose();
    expect(dom.removeEventListener).toHaveBeenCalledWith(
      mockInput,
      'input',
      handler
    );
  });

  it('allows _dispose to be called multiple times', () => {
    const mockInput = {};
    const onChange = jest.fn();
    const dom = {
      createElement: jest.fn(() => mockInput),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    const input = createNumberInput('1', onChange, dom);
    dom.removeEventListener.mockClear();

    input._dispose();
    input._dispose();

    const [[el, , handler]] = dom.addEventListener.mock.calls;
    expect(dom.removeEventListener).toHaveBeenCalledTimes(2);
    expect(dom.removeEventListener).toHaveBeenNthCalledWith(
      1,
      el,
      'input',
      handler
    );
    expect(dom.removeEventListener).toHaveBeenNthCalledWith(
      2,
      el,
      'input',
      handler
    );
  });
});
