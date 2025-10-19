import { describe, test, expect } from '@jest/globals';
import { isType, isValidBoolean } from '../../src/core/validation.js';

describe('isType', () => {
  test('returns true for matching types', () => {
    expect(isType('test', 'string')).toBe(true);
    expect(isType(123, 'number')).toBe(true);
    expect(isType(true, 'boolean')).toBe(true);
    expect(isType({}, 'object')).toBe(true);
    expect(isType([], 'object')).toBe(true);
    expect(isType(null, 'object')).toBe(true);
    expect(isType(undefined, 'undefined')).toBe(true);
    expect(isType(() => {}, 'function')).toBe(true);
    expect(isType(Symbol('test'), 'symbol')).toBe(true);
    expect(isType(BigInt(1), 'bigint')).toBe(true);
  });

  test('returns false for non-matching types', () => {
    expect(isType('test', 'number')).toBe(false);
    expect(isType(123, 'string')).toBe(false);
    expect(isType(true, 'number')).toBe(false);
    expect(isType(null, 'undefined')).toBe(false);
    expect(isType(undefined, 'null')).toBe(false);
  });
});

describe('isValidBoolean', () => {
  test('returns true for boolean values', () => {
    expect(isValidBoolean(true)).toBe(true);
    expect(isValidBoolean(false)).toBe(true);
  });

  test('returns true for boolean strings', () => {
    expect(isValidBoolean('true')).toBe(true);
    expect(isValidBoolean('false')).toBe(true);
    expect(isValidBoolean('TRUE')).toBe(true);
    expect(isValidBoolean('FALSE')).toBe(true);
    expect(isValidBoolean('True')).toBe(true);
    expect(isValidBoolean('False')).toBe(true);
  });

  test('returns false for non-boolean values', () => {
    expect(isValidBoolean('')).toBe(false);
    expect(isValidBoolean('yes')).toBe(false);
    expect(isValidBoolean('no')).toBe(false);
    expect(isValidBoolean(1)).toBe(false);
    expect(isValidBoolean(0)).toBe(false);
    expect(isValidBoolean(null)).toBe(false);
    expect(isValidBoolean(undefined)).toBe(false);
    expect(isValidBoolean({})).toBe(false);
    expect(isValidBoolean([])).toBe(false);
  });
});
