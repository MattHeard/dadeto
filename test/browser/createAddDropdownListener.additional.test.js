import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener additional cases', () => {
  it('attaches the change event and returns undefined', () => {
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdown = {};
    const addListener = createAddDropdownListener(onChange, dom);

    const result = addListener(dropdown);

    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledTimes(1);
    expect(dom.addEventListener).toHaveBeenCalledWith(dropdown, 'change', onChange);
  });

  it('can attach the same handler to multiple dropdowns', () => {
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdownA = {};
    const dropdownB = {};
    const addListener = createAddDropdownListener(onChange, dom);

    addListener(dropdownA);
    addListener(dropdownB);

    expect(dom.addEventListener).toHaveBeenCalledTimes(2);
    expect(dom.addEventListener).toHaveBeenNthCalledWith(1, dropdownA, 'change', onChange);
    expect(dom.addEventListener).toHaveBeenNthCalledWith(2, dropdownB, 'change', onChange);
  });
});
