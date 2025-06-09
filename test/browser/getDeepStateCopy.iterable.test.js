import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy arrays of objects', () => {
  it('clones nested arrays without mutating the original', () => {
    const original = { levels: [{ a: 1 }, { b: { c: 2 } }] };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.levels).not.toBe(original.levels);
    expect(copy.levels[0]).not.toBe(original.levels[0]);
    expect(copy.levels[1].b).not.toBe(original.levels[1].b);
    copy.levels[1].b.c = 3;
    expect(original.levels[1].b.c).toBe(2);
  });
});
