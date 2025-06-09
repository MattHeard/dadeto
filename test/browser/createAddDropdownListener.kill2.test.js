import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener mutation elimination', () => {
  it('returns a unary function that registers on change and yields undefined', () => {
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdown = {};
    const addListener = createAddDropdownListener(onChange, dom);

    expect(typeof addListener).toBe('function');
    expect(addListener.length).toBe(1);

    const result = addListener(dropdown);
    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledWith(dropdown, 'change', onChange);
  });
});
