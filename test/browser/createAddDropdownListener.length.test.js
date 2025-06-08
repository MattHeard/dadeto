import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener signature', () => {
  it('expects two parameters and returns a unary function', () => {
    expect(createAddDropdownListener.length).toBe(2);
    const dom = { addEventListener: jest.fn() };
    const listener = createAddDropdownListener(jest.fn(), dom);
    expect(typeof listener).toBe('function');
    expect(listener.length).toBe(1);
  });
});
