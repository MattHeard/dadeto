import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

// Additional test targeting Stryker survivor around toys.js line 132
// Ensures returned function registers the change handler

describe('createAddDropdownListener mutant killer', () => {
  it('registers change handler and returns undefined', () => {
    const dom = { addEventListener: jest.fn() };
    const onChange = jest.fn();
    const dropdown = {};

    const addListener = createAddDropdownListener(onChange, dom);
    expect(typeof addListener).toBe('function');

    const result = addListener(dropdown);

    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledWith(dropdown, 'change', onChange);
  });
});
