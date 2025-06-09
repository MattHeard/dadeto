import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy independent copies', () => {
  it('returns a fresh deep copy each time', () => {
    const original = { section: { items: [1, 2] } };
    const first = getDeepStateCopy(original);
    const second = getDeepStateCopy(original);
    // basic equality checks
    expect(first).toEqual(original);
    expect(second).toEqual(original);
    // ensure different references
    expect(first).not.toBe(second);
    expect(first.section).not.toBe(original.section);
    expect(second.section).not.toBe(original.section);
    // mutate first copy and ensure isolation
    first.section.items.push(3);
    expect(second.section.items).toEqual([1, 2]);
    expect(original.section.items).toEqual([1, 2]);
  });
});
