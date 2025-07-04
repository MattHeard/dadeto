import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener mutation guard', () => {
  it('creates distinct handlers that register change listeners', () => {
    const onChange = jest.fn();
    const domA = { addEventListener: jest.fn() };
    const domB = { addEventListener: jest.fn() };
    const dropdownA = {};
    const dropdownB = {};
    const handlerA = createAddDropdownListener(onChange, domA);
    const handlerB = createAddDropdownListener(onChange, domB);
    expect(typeof handlerA).toBe('function');
    expect(typeof handlerB).toBe('function');
    expect(handlerA).not.toBe(handlerB);
    handlerA(dropdownA);
    handlerB(dropdownB);
    expect(domA.addEventListener).toHaveBeenCalledWith(
      dropdownA,
      'change',
      onChange
    );
    expect(domB.addEventListener).toHaveBeenCalledWith(
      dropdownB,
      'change',
      onChange
    );
  });
});
