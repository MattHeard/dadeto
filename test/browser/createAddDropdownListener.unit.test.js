import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener (unit)', () => {
  it('returns a listener that registers on change', () => {
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdown = {};

    const addListener = createAddDropdownListener(onChange, dom);
    expect(typeof addListener).toBe('function');

    addListener(dropdown);

    expect(dom.addEventListener).toHaveBeenCalledWith(
      dropdown,
      'change',
      onChange
    );
  });
});
