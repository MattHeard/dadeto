import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

// Consolidated test from createAddDropdownListener.instance.test.js
// Verifies a new handler is returned on each call while using the same dom

describe('createAddDropdownListener using same dom', () => {
  it('returns a new handler on each invocation', () => {
    const dom = { addEventListener: jest.fn() };
    const onChange = jest.fn();

    const first = createAddDropdownListener(onChange, dom);
    const second = createAddDropdownListener(onChange, dom);

    expect(typeof first).toBe('function');
    expect(typeof second).toBe('function');
    expect(first).not.toBe(second);

    const dropdown1 = {};
    const dropdown2 = {};
    first(dropdown1);
    second(dropdown2);

    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      1,
      dropdown1,
      'change',
      onChange
    );
    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      2,
      dropdown2,
      'change',
      onChange
    );
  });
});
