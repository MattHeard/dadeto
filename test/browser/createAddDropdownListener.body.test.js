import { describe, it, expect, jest } from '@jest/globals';
import { createAddDropdownListener } from '../../src/browser/toys.js';

describe('createAddDropdownListener implementation', () => {
  it('contains dom.addEventListener call in its body', () => {
    const listener = createAddDropdownListener(jest.fn(), {
      addEventListener: jest.fn(),
    });
    expect(typeof listener).toBe('function');
    expect(listener.toString()).toMatch(/addEventListener/);
  });
});
