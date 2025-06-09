import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener ensures listener registration', () => {
  it('returns a unary function that attaches a change handler', () => {
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdown = {};

    const listener = createAddDropdownListener(onChange, dom);

    expect(typeof listener).toBe('function');
    expect(listener.length).toBe(1);

    const result = listener(dropdown);

    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledTimes(1);
    expect(dom.addEventListener).toHaveBeenCalledWith(
      dropdown,
      'change',
      onChange
    );
  });
});
