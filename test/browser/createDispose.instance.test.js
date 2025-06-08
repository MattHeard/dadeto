import { describe, it, expect, jest } from '@jest/globals';
import { createDispose } from '../../src/browser/toys.js';

describe('createDispose instances', () => {
  it('returns a new dispose function on each call', () => {
    const dom = { removeAllChildren: jest.fn() };
    const container = {};
    const rows = [];

    const first = createDispose([], dom, container, rows);
    const second = createDispose([], dom, container, rows);

    expect(typeof first).toBe('function');
    expect(typeof second).toBe('function');
    expect(first).not.toBe(second);
  });
});
