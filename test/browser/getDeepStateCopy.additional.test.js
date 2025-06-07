import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/data.js';

describe('getDeepStateCopy nested cloning', () => {
  it('does not mutate the original object when deep copy is modified', () => {
    const original = { level1: { level2: { value: 'a' } } };
    const copy = getDeepStateCopy(original);
    copy.level1.level2.value = 'b';
    expect(original.level1.level2.value).toBe('a');
    expect(copy.level1.level2.value).toBe('b');
    expect(copy).not.toBe(original);
    expect(copy.level1).not.toBe(original.level1);
    expect(copy.level1.level2).not.toBe(original.level1.level2);
  });

  it('clones arrays without sharing references', () => {
    const original = { arr: [1, { inner: 'x' }] };
    const copy = getDeepStateCopy(original);
    copy.arr[1].inner = 'y';
    expect(original.arr[1].inner).toBe('x');
    expect(copy.arr[1].inner).toBe('y');
    expect(copy.arr).not.toBe(original.arr);
  });
});
