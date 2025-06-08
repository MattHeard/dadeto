import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener deferred registration', () => {
  it('defers calling addEventListener until the returned function is invoked', () => {
    const dom = { addEventListener: jest.fn() };
    const handler = jest.fn();

    const addListener = createAddDropdownListener(handler, dom);
    // Should not register listener yet
    expect(dom.addEventListener).not.toHaveBeenCalled();

    addListener('dropdown');

    expect(dom.addEventListener).toHaveBeenCalledTimes(1);
    expect(dom.addEventListener).toHaveBeenCalledWith('dropdown', 'change', handler);
  });
});
