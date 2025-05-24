import { describe, test, expect } from '@jest/globals';
import { pick, mapValues } from '../../src/utils/objectUtils.js';

describe('pick', () => {
  test('picks specified properties from an object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  test('returns empty object if source is not an object', () => {
    expect(pick(null, ['a'])).toEqual({});
    expect(pick(undefined, ['a'])).toEqual({});
    expect(pick('test', ['a'])).toEqual({});
    expect(pick(123, ['a'])).toEqual({});
  });

  test('ignores non-existent properties', () => {
    const obj = { a: 1, b: 2 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1 });
  });

  test('returns empty object if no keys provided', () => {
    const obj = { a: 1, b: 2 };
    expect(pick(obj, [])).toEqual({});
  });
});

describe('mapValues', () => {
  test('transforms values using the provided function', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = mapValues(obj, (value) => value * 2);
    expect(result).toEqual({ a: 2, b: 4, c: 6 });
  });

  test('provides both value and key to the transform function', () => {
    const obj = { a: 1, b: 2 };
    const result = mapValues(obj, (value, key) => `${key}_${value}`);
    expect(result).toEqual({ a: 'a_1', b: 'b_2' });
  });

  test('returns empty object if source is not an object', () => {
    expect(mapValues(null, (v) => v)).toEqual({});
    expect(mapValues(undefined, (v) => v)).toEqual({});
    expect(mapValues('test', (v) => v)).toEqual({});
    expect(mapValues(123, (v) => v)).toEqual({});
  });

  test('handles empty objects', () => {
    expect(mapValues({}, (v) => v)).toEqual({});
  });
});
