import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener mutation extra', () => {
  it('returns a unary listener that registers change handler once when invoked', () => {
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdown = {};

    expect(createAddDropdownListener.length).toBe(2);
    const addListener = createAddDropdownListener(onChange, dom);
    expect(typeof addListener).toBe('function');
    expect(addListener.length).toBe(1);

    expect(dom.addEventListener).not.toHaveBeenCalled();
    const result = addListener(dropdown);
    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledTimes(1);
    expect(dom.addEventListener).toHaveBeenCalledWith(
      dropdown,
      'change',
      onChange
    );
  });
});
