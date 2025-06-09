import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy survivor elimination', () => {
  it('creates a deep copy that does not share references', () => {
    const original = { a: { b: 1 } };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.a).not.toBe(original.a);
    copy.a.b = 2;
    expect(original.a.b).toBe(1);
  });
});
