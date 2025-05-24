import { describe, it, expect, jest } from '@jest/globals';
import { createDispose } from '../../src/browser/toys.js';

describe('createDispose', () => {
  it('can be called and disposed', () => {
    // Mock the required parameters
    const disposers = [];
    const dom = {
      removeAllChildren: jest.fn()
    };
    const container = {};
    const rows = [];

    // Create and call dispose
    const dispose = createDispose(disposers, dom, container, rows);
    dispose();

    // Verify the cleanup was performed
    expect(dom.removeAllChildren).toHaveBeenCalledWith(container);
    expect(rows).toHaveLength(0);
  });
});
