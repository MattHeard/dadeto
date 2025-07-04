import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener forward event', () => {
  it('registers change handler and forwards event object', () => {
    const onChange = jest.fn();
    const dom = {
      addEventListener: jest.fn((el, evt, handler) => handler('evt')),
    };
    const dropdown = {};
    const addListener = createAddDropdownListener(onChange, dom);
    const result = addListener(dropdown);
    expect(result).toBeUndefined();
    expect(dom.addEventListener).toHaveBeenCalledWith(
      dropdown,
      'change',
      onChange
    );
    expect(onChange).toHaveBeenCalledWith('evt');
  });
});
