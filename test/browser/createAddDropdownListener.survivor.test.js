import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener survivor check', () => {
  it('returns a unary function that registers the handler and forwards events', () => {
    const dropdown = {};
    const onChange = jest.fn();
    const dom = {
      addEventListener: jest.fn((el, event, handler) => {
        // Save handler to invoke later
        dom._handler = handler;
      }),
    };

    const addListener = createAddDropdownListener(onChange, dom);
    expect(typeof addListener).toBe('function');
    expect(addListener.length).toBe(1);

    const result = addListener(dropdown);

    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledWith(
      dropdown,
      'change',
      onChange
    );

    // Simulate event firing
    dom._handler('evt');
    expect(onChange).toHaveBeenCalledWith('evt');
  });
});
