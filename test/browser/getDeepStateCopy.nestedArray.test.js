import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy nested arrays', () => {
  it('deeply clones objects with multi-level arrays', () => {
    const original = { items: [{ a: 1 }, { b: [2, { c: 3 }] }] };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.items).not.toBe(original.items);
    expect(copy.items[0]).not.toBe(original.items[0]);
    expect(copy.items[1]).not.toBe(original.items[1]);
    expect(copy.items[1].b).not.toBe(original.items[1].b);
    expect(copy.items[1].b[1]).not.toBe(original.items[1].b[1]);
  });
});
