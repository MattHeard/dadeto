import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener deferred registration', () => {
  it('does not register until the returned listener is invoked', () => {
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdown = {};

    const addListener = createAddDropdownListener(onChange, dom);
    // Should not register the listener yet
    expect(dom.addEventListener).not.toHaveBeenCalled();

    addListener(dropdown);

    expect(dom.addEventListener).toHaveBeenCalledTimes(1);
    expect(dom.addEventListener).toHaveBeenCalledWith(dropdown, 'change', onChange);
  });
});
