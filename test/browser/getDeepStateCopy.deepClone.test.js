import { describe, it, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy deep clone', () => {
  it('creates a deep clone of the provided object', () => {
    const original = { level1: { level2: { value: 'x' } } };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.level1).not.toBe(original.level1);
    expect(copy.level1.level2).not.toBe(original.level1.level2);
    copy.level1.level2.value = 'y';
    expect(original.level1.level2.value).toBe('x');
  });

  it('handles objects containing arrays', () => {
    const original = { arr: [1, 2, { x: 3 }] };
    const copy = getDeepStateCopy(original);
    expect(copy).toEqual(original);
    expect(copy.arr).not.toBe(original.arr);
    expect(copy.arr[2]).not.toBe(original.arr[2]);
  });

  it('returns a fresh deep copy on each call', () => {
    const original = { section: { items: [1, 2] } };
    const first = getDeepStateCopy(original);
    const second = getDeepStateCopy(original);
    expect(first).not.toBe(second);
    expect(first.section).not.toBe(original.section);
    expect(second.section).not.toBe(original.section);
    first.section.items.push(3);
    expect(second.section.items).toEqual([1, 2]);
    expect(original.section.items).toEqual([1, 2]);
  });

  it('does not mutate the source when modifying the copy', () => {
    const original = { a: { b: 1 } };
    const copy = getDeepStateCopy(original);
    copy.a.b = 2;
    expect(original.a.b).toBe(1);
  });
});
