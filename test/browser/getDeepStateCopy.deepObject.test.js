import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy deeply nested object', () => {
  it('clones objects with multiple nested levels', () => {
    const original = { a: { b: { c: { d: 1 } } } };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.a.b.c).not.toBe(original.a.b.c);
    copy.a.b.c.d = 2;
    expect(original.a.b.c.d).toBe(1);
  });
});
