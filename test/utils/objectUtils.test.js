import { describe, test, expect } from '@jest/globals';
import { formatAsString, pick, mapValues } from '../../src/utils/objectUtils.js';

describe('formatAsString', () => {
  test('formats empty object as string', () => {
    expect(formatAsString({})).toBe('{}');
  });

  test('formats simple object as string', () => {
    const obj = { a: 1, b: 'test', c: true };
    expect(formatAsString(obj)).toBe('{ a: 1, b: "test", c: true }');
  });

  test('formats nested objects', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(formatAsString(obj)).toBe('{ a: { b: { c: 1 } } }');
  });

  test('handles arrays', () => {
    const obj = { a: [1, 2, 3] };
    expect(formatAsString(obj)).toBe('{ a: [1,2,3] }');
  });

  test('handles null and undefined values', () => {
    const obj = { a: null, b: undefined };
    expect(formatAsString(obj)).toBe('{ a: null, b: undefined }');
  });

  test('handles multiline formatting', () => {
    const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
    const expected = '{\n  a: 1,\n  b: { c: 2 },\n  d: [3,4]\n}';
    expect(formatAsString(obj, { multiline: true })).toBe(expected);
  });

  test('handles non-object inputs', () => {
    expect(formatAsString(null)).toBe('{}');
    expect(formatAsString(undefined)).toBe('{}');
    expect(formatAsString('test')).toBe('test');
    expect(formatAsString(123)).toBe('123');
  });
});

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
