import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

// Additional tests for createAddDropdownListener
describe('createAddDropdownListener instances', () => {
  it('returns a new handler function on each call', () => {
    const handler1 = createAddDropdownListener(jest.fn(), { addEventListener: jest.fn() });
    const handler2 = createAddDropdownListener(jest.fn(), { addEventListener: jest.fn() });

    expect(typeof handler1).toBe('function');
    expect(typeof handler2).toBe('function');
    expect(handler1).not.toBe(handler2);
  });
});

