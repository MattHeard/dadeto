import { describe, test, expect } from '@jest/globals';
import { pick, mapValues, isObject } from '../../src/utils/objectUtils.js';

describe.each([
  ['pick', obj => pick(obj, ['a'])],
  ['mapValues', obj => mapValues(obj, v => v)],
])('%s', (name, fn) => {
  test('returns empty object if source is not an object', () => {
    expect(fn(null)).toEqual({});
    expect(fn(undefined)).toEqual({});
    expect(fn('test')).toEqual({});
    expect(fn(123)).toEqual({});
  });
});

describe('pick', () => {
  test('picks specified properties from an object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  test('ignores non-existent properties', () => {
    const obj = { a: 1, b: 2 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1 });
  });

  test('does not include missing keys', () => {
    const obj = { a: 1, b: 2 };
    const result = pick(obj, ['a', 'c']);
    expect(result).toEqual({ a: 1 });
    expect(result).not.toHaveProperty('c');
  });

  test('returns empty object if no keys provided', () => {
    const obj = { a: 1, b: 2 };
    expect(pick(obj, [])).toEqual({});
  });
});

describe('mapValues', () => {
  test('transforms values using the provided function', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = mapValues(obj, value => value * 2);
    expect(result).toEqual({ a: 2, b: 4, c: 6 });
  });

  test('provides both value and key to the transform function', () => {
    const obj = { a: 1, b: 2 };
    const result = mapValues(obj, (value, key) => `${key}_${value}`);
    expect(result).toEqual({ a: 'a_1', b: 'b_2' });
  });

  test('handles empty objects', () => {
    expect(mapValues({}, v => v)).toEqual({});
  });

  test('does not mutate the source object', () => {
    const obj = { a: 1, b: 2 };
    const copy = { ...obj };
    const result = mapValues(obj, v => v + 1);
    expect(obj).toEqual(copy);
    expect(result).toEqual({ a: 2, b: 3 });
  });
});

describe('isObject', () => {
  test('detects plain objects', () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
  });

  test('rejects arrays, null, and primitives', () => {
    expect(isObject([])).toBe(false);
    expect(isObject(null)).toBe(false);
    expect(isObject(123)).toBe(false);
    expect(isObject('str')).toBe(false);
  });
});
