import { describe, it, expect } from '@jest/globals';
import { convertArrayToKeyValueObject } from '../../src/browser/toys.js';

describe('convertArrayToKeyValueObject', () => {
  it('should convert an array of key-value objects to a single object', () => {
    const input = [
      { key: 'name', value: 'John' },
      { key: 'age', value: 30 },
      { key: 'city', value: 'New York' },
    ];
    const expected = {
      name: 'John',
      age: 30,
      city: 'New York',
    };
    expect(convertArrayToKeyValueObject(input)).toEqual(expected);
  });

  it('should handle undefined or null values by converting them to empty strings', () => {
    const input = [
      { key: 'name', value: 'John' },
      { key: 'age', value: null },
      { key: 'city' }, // value is undefined
    ];
    const expected = {
      name: 'John',
      age: '',
      city: '',
    };
    expect(convertArrayToKeyValueObject(input)).toEqual(expected);
  });

  it('should skip objects without a key property', () => {
    const input = [
      { key: 'name', value: 'John' },
      { value: 'should be skipped' },
      { key: 'city', value: 'New York' },
      { notKey: 'test', value: 'should be skipped' },
    ];
    const expected = {
      name: 'John',
      city: 'New York',
    };
    expect(convertArrayToKeyValueObject(input)).toEqual(expected);
  });

  it('should ignore non-object entries in the input array', () => {
    const input = [
      { key: 'name', value: 'John' },
      null,
      undefined,
      'string',
      { key: 'city', value: 'NY' },
    ];
    const expected = {
      name: 'John',
      city: 'NY',
    };
    expect(convertArrayToKeyValueObject(input)).toEqual(expected);
  });

  it('should skip null entries in the input array', () => {
    const input = [
      { key: 'name', value: 'John' },
      null,
      { key: 'age', value: 30 },
    ];
    const expected = {
      name: 'John',
      age: 30,
    };
    expect(convertArrayToKeyValueObject(input)).toEqual(expected);
  });

  it('should return an empty object for an empty array', () => {
    expect(convertArrayToKeyValueObject([])).toEqual({});
  });

  it('should handle non-array inputs by returning an empty object', () => {
    expect(convertArrayToKeyValueObject(null)).toEqual({});
    expect(convertArrayToKeyValueObject(undefined)).toEqual({});
    expect(convertArrayToKeyValueObject('not an array')).toEqual({});
    expect(convertArrayToKeyValueObject(123)).toEqual({});
    expect(convertArrayToKeyValueObject({})).toEqual({});
  });

  it('should preserve falsy but defined values', () => {
    const input = [
      { key: 'count', value: 0 },
      { key: 'active', value: false },
      { key: 'empty', value: '' },
    ];
    const expected = {
      count: 0,
      active: false,
      empty: '',
    };
    expect(convertArrayToKeyValueObject(input)).toEqual(expected);
  });
});
