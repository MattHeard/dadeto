import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener repeated calls', () => {
  it('registers the handler each time it is invoked', () => {
    const onChange = jest.fn();
    const dom = { addEventListener: jest.fn() };
    const dropdown = {};

    const addListener = createAddDropdownListener(onChange, dom);

    addListener(dropdown);
    addListener(dropdown);

    expect(dom.addEventListener).toHaveBeenCalledTimes(2);
    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      1,
      dropdown,
      'change',
      onChange
    );
    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      2,
      dropdown,
      'change',
      onChange
    );
  });
});
