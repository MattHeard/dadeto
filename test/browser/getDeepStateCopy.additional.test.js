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

  it('creates independent array copies', () => {
    const original = { items: [{ id: 1 }, { id: 2 }] };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.items).not.toBe(original.items);
    expect(copy.items[0]).not.toBe(original.items[0]);
    copy.items[0].id = 3;
    expect(original.items[0].id).toBe(1);
  });
});
