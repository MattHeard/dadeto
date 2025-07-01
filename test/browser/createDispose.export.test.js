import { describe, it, expect } from '@jest/globals';

// Import the module within the test to ensure coverage of the export line

describe('createDispose export', () => {
  it('is a function that expects one parameter', async () => {
    const { createDispose } = await import('../../src/browser/toys.js');
    expect(typeof createDispose).toBe('function');
    expect(createDispose.length).toBe(1);
  });
});
