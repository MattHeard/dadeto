import { describe, it, expect, jest } from '@jest/globals';
import { createDispose } from '../../src/browser/toys.js';

describe('createDispose', () => {
  it('can be called and disposed', () => {
    // Mock the required parameters
    const disposer = jest.fn();
    const disposers = [disposer];
    const dom = {
      removeAllChildren: jest.fn()
    };
    const container = {};
    const rows = ['row'];

    // Create and call dispose
    const dispose = createDispose(disposers, dom, container, rows);

    // Ensure a function was returned
    expect(typeof dispose).toBe('function');

    dispose();

    // Verify the cleanup was performed
    expect(disposer).toHaveBeenCalled();
    expect(disposers).toHaveLength(0);
    expect(dom.removeAllChildren).toHaveBeenCalledWith(container);
    expect(rows).toHaveLength(0);
  });
});
