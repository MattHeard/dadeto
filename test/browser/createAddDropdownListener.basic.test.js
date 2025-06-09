import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener basic behavior', () => {
  it('returns a unary listener that registers a change handler when invoked', () => {
    expect(createAddDropdownListener.length).toBe(2);
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdown = {};

    const listener = createAddDropdownListener(onChange, dom);
    expect(typeof listener).toBe('function');
    expect(listener.length).toBe(1);
    expect(dom.addEventListener).not.toHaveBeenCalled();

    const result = listener(dropdown);

    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledTimes(1);
    expect(dom.addEventListener).toHaveBeenCalledWith(dropdown, 'change', onChange);
  });
});
