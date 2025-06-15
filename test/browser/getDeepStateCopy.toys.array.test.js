import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy arrays from toys.js', () => {
  it('changing the copy does not mutate the original', () => {
    const original = { arr: [1, { a: 'b' }] };
    const copy = getDeepStateCopy(original);
    copy.arr[1].a = 'c';
    expect(original.arr[1].a).toBe('b');
  });
});
