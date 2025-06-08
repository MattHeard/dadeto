import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener mutation check', () => {
  it('returns a listener that registers and invokes onChange', () => {
    const onChange = jest.fn();
    const dropdown = {};
    const dom = {
      addEventListener: jest.fn((el, evt, handler) => {
        handler();
      }),
    };

    const addListener = createAddDropdownListener(onChange, dom);
    expect(typeof addListener).toBe('function');
    expect(addListener.length).toBe(1);

    const result = addListener(dropdown);

    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledWith(dropdown, 'change', onChange);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
