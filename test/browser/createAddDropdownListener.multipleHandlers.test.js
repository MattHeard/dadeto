import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener multiple handlers', () => {
  it('uses the provided onChange for each instance', () => {
    const dom = { addEventListener: jest.fn() };
    const dropdownA = {};
    const dropdownB = {};
    const handlerA = jest.fn();
    const handlerB = jest.fn();

    const addA = createAddDropdownListener(handlerA, dom);
    const addB = createAddDropdownListener(handlerB, dom);

    addA(dropdownA);
    addB(dropdownB);

    expect(dom.addEventListener).toHaveBeenCalledTimes(2);
    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      1,
      dropdownA,
      'change',
      handlerA
    );
    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      2,
      dropdownB,
      'change',
      handlerB
    );
  });
});
