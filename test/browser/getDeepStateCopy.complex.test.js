import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy complex object', () => {
  it('deeply clones nested arrays and objects', () => {
    const original = { a: [{ b: [1, 2] }, { c: { d: 4 } }] };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.a).not.toBe(original.a);
    expect(copy.a[0]).not.toBe(original.a[0]);
    expect(copy.a[0].b).not.toBe(original.a[0].b);
    expect(copy.a[1].c).not.toBe(original.a[1].c);
    copy.a[0].b.push(3);
    copy.a[1].c.d = 5;
    expect(original.a[0].b).toEqual([1, 2]);
    expect(original.a[1].c.d).toBe(4);
  });
});
