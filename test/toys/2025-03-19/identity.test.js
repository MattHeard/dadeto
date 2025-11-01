import { identity } from '../../../src/core/browser/toys/2025-03-19/identity.js';

describe('identity function', () => {
  test('returns primitive values unchanged', () => {
    expect(identity(42)).toBe(42);
    expect(identity('hello')).toBe('hello');
    expect(identity(true)).toBe(true);
    expect(identity(false)).toBe(false);
    expect(identity(null)).toBe(null);
    expect(identity(undefined)).toBe(undefined);
  });

  test('returns object references unchanged', () => {
    const obj = { foo: 'bar' };
    const arr = [1, 2, 3];
    const func = () => {};

    expect(identity(obj)).toBe(obj);
    expect(identity(arr)).toBe(arr);
    expect(identity(func)).toBe(func);
  });

  test('keeps object values unchanged', () => {
    const complexObj = {
      name: 'test',
      nested: { value: 123 },
      array: [1, 2, { key: 'value' }],
    };

    const result = identity(complexObj);

    expect(result).toEqual(complexObj);
    expect(result.nested.value).toBe(123);
    expect(result.array[2].key).toBe('value');
  });
});
