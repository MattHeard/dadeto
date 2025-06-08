import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy arrays from toys.js', () => {
  it('creates a deep copy of objects containing arrays', () => {
    const original = { arr: [1, 2, { x: 3 }] };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.arr).not.toBe(original.arr);
    expect(copy.arr[2]).not.toBe(original.arr[2]);
  });
});
