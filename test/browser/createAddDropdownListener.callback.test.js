import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener callback behavior', () => {
  it('registers a change handler and forwards the event', () => {
    const onChange = jest.fn();
    const dropdown = {};
    const dom = {
      addEventListener: jest.fn((el, event, handler) => {
        // Immediately invoke the handler to simulate event dispatch
        handler({ currentTarget: el });
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
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ currentTarget: dropdown });
  });
});
