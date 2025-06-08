import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy deep clone validation', () => {
  it('clones nested objects without keeping references', () => {
    const original = { level1: { level2: { value: 'x' } } };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.level1).not.toBe(original.level1);
    expect(copy.level1.level2).not.toBe(original.level1.level2);
    copy.level1.level2.value = 'y';
    expect(original.level1.level2.value).toBe('x');
  });
});
