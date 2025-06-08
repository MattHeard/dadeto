import { describe, it, expect, jest } from '@jest/globals';
import { createDispose } from '../../src/browser/toys.js';

describe('createDispose with empty arrays', () => {
  it('returns a disposer function even with empty parameters', () => {
    const disposers = [];
    const dom = { removeAllChildren: jest.fn() };
    const container = {};
    const rows = [];

    const dispose = createDispose(disposers, dom, container, rows);
    expect(typeof dispose).toBe('function');
    dispose();
    expect(dom.removeAllChildren).toHaveBeenCalledWith(container);
    expect(disposers).toHaveLength(0);
    expect(rows).toHaveLength(0);
  });
});
