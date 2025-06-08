import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener error propagation', () => {
  it('propagates errors from dom.addEventListener', () => {
    const onChange = jest.fn();
    const dropdown = {};
    const dom = {
      addEventListener: jest.fn(() => {
        throw new Error('fail');
      }),
    };
    const addListener = createAddDropdownListener(onChange, dom);
    expect(() => addListener(dropdown)).toThrow('fail');
  });
});
