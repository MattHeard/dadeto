import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy mutant killer', () => {
  it('creates independent deep copies on each call', () => {
    const original = { nested: { arr: [1, 2] } };
    const copyA = getDeepStateCopy(original);
    const copyB = getDeepStateCopy(original);

    expect(copyA).toEqual(original);
    expect(copyB).toEqual(original);
    expect(copyA).not.toBe(copyB);
    expect(copyA.nested).not.toBe(original.nested);
    expect(copyB.nested).not.toBe(original.nested);

    copyA.nested.arr.push(3);
    expect(copyB.nested.arr).toEqual([1, 2]);
    expect(original.nested.arr).toEqual([1, 2]);
  });
});
