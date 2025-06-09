import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener direct usage', () => {
  it('registers change handler on the provided element', () => {
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdown = {};

    const addListener = createAddDropdownListener(onChange, dom);
    expect(typeof addListener).toBe('function');
    expect(createAddDropdownListener.length).toBe(2);
    expect(addListener.length).toBe(1);

    const result = addListener(dropdown);
    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledTimes(1);
    expect(dom.addEventListener).toHaveBeenCalledWith(dropdown, 'change', onChange);
  });
});
