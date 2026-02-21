import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { get } from '../../../src/core/browser/toys/2025-03-29/get.js';

describe('get function with path traversal', () => {
  let mockGetData;
  let env;
  const testData = {
    user: {
      name: 'Alice',
      age: 30,
      address: {
        city: 'London',
        zip: 'ABC 123',
      },
      orders: [
        { id: 1, item: 'Book' },
        { id: 2, item: 'Pen' },
      ],
    },
    status: 'active',
  };

  beforeEach(() => {
    // Reset mocks and environment before each test
    mockGetData = jest.fn().mockReturnValue(testData);
    env = new Map([['getData', mockGetData]]);
  });

  test('should return the value for a top-level key', () => {
    expect(get('status', env)).toBe(JSON.stringify('active'));
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should return the value for a nested key', () => {
    expect(get('user.name', env)).toBe(JSON.stringify('Alice'));
    expect(get('user.address.city', env)).toBe(JSON.stringify('London'));
    expect(mockGetData).toHaveBeenCalledTimes(2);
  });

  test('should return the value for an array index', () => {
    expect(get('user.orders.0.item', env)).toBe(JSON.stringify('Book'));
    expect(get('user.orders.1.id', env)).toBe(JSON.stringify(2));
    expect(mockGetData).toHaveBeenCalledTimes(2);
  });

  test('should return the full object/array if path points to it', () => {
    expect(get('user.address', env)).toBe(
      JSON.stringify({ city: 'London', zip: 'ABC 123' })
    );
    expect(get('user.orders.1', env)).toBe(
      JSON.stringify({ id: 2, item: 'Pen' })
    );
    expect(mockGetData).toHaveBeenCalledTimes(2);
  });

  test('should return an error if a path segment does not exist (object)', () => {
    const expectedErrorMessage = `Error: Path segment 'lastName' not found at 'user.lastName'. Available keys/indices: name, age, address, orders`;
    expect(get('user.lastName', env)).toBe(expectedErrorMessage);
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should return an error if a path segment does not exist (array index)', () => {
    const expectedErrorMessage = `Error: Path segment '2' not found at 'user.orders.2'. Available keys/indices: 0, 1`;
    expect(get('user.orders.2', env)).toBe(expectedErrorMessage);
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should return an error trying to access property on non-object', () => {
    const expectedErrorMessage = `Error: Cannot access property 'city' on non-object value at path 'user.name'. Value is: "Alice"`;
    expect(get('user.name.city', env)).toBe(expectedErrorMessage);
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  // Test for stringifying error remains similar
  test('should handle non-stringifiable values gracefully at the end of the path', () => {
    const circular = {};
    circular.myself = circular;
    const circularData = { top: { nested: circular } };
    mockGetData.mockReturnValue(circularData);
    expect(get('top.nested', env)).toMatch(
      /^Error stringifying final value at path "top.nested":/
    );
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should return error if getData returns null', () => {
    mockGetData.mockReturnValue(null);
    expect(get('any.path', env)).toBe(
      "Error: 'getData' did not return a valid object or array."
    );
  });

  test('should return error if getData returns a primitive', () => {
    mockGetData.mockReturnValue(42);
    expect(get('any.path', env)).toBe(
      "Error: 'getData' did not return a valid object or array."
    );
  });

  test('should short-circuit reducer when acc.error is set (indirect via get)', () => {
    mockGetData.mockReturnValue({ a: { b: 1 } });
    // 'a' exists, 'x' does not, 'y' should not be processed
    expect(get('a.x.y', env)).toMatch(/Error: Path segment 'x' not found/);
  });

  test('should return undefined for valid path to undefined value', () => {
    const dataWithUndefined = {
      user: {
        settings: {
          theme: undefined,
        },
      },
    };
    mockGetData.mockReturnValue(dataWithUndefined);
    expect(get('user.settings.theme', env)).toBe(JSON.stringify(undefined));
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should handle empty input string by returning full object', () => {
    mockGetData.mockReturnValue(testData);
    expect(get('', env)).toBe(JSON.stringify(testData));
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should treat whitespace-only input as empty', () => {
    mockGetData.mockReturnValue(testData);
    expect(get('   ', env)).toBe(JSON.stringify(testData));
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should handle numeric string keys in object', () => {
    const objWithNumericKeys = { 2025: { value: 'future' } };
    mockGetData.mockReturnValue(objWithNumericKeys);
    expect(get('2025.value', env)).toBe(JSON.stringify('future'));
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should return an error if getData throws an error', () => {
    const errorMessage = 'Failed to fetch data';
    mockGetData.mockImplementation(() => {
      throw new Error(errorMessage);
    });
    expect(get('user.name', env)).toBe(
      `Error during data retrieval or path traversal for "user.name": ${errorMessage}`
    );
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should return error when getData is missing from env', () => {
    const emptyEnv = new Map();
    expect(get('any.path', emptyEnv)).toBe(
      "Error: 'getData' dependency is missing."
    );
  });

  test('should return error when getData throws a string', () => {
    const throwingEnv = new Map([
      ['getData', () => { throw 'storage unavailable'; }],
    ]);
    expect(get('some.path', throwingEnv)).toBe(
      'Error during data retrieval or path traversal for "some.path": storage unavailable'
    );
  });

  test('should return not-found error when array is accessed with non-integer key', () => {
    mockGetData.mockReturnValue({ items: [1, 2, 3] });
    const result = get('items.foo', env);
    expect(result).toMatch(/not found/);
  });

  test('should handle stringify error when thrown value is a string', () => {
    const objWithStringThrow = {
      toJSON() { throw 'raw string error'; },
    };
    mockGetData.mockReturnValue({ val: objWithStringThrow });
    const result = get('val', env);
    expect(result).toBe(
      'Error stringifying final value at path "val": raw string error'
    );
  });

  test('should return error when accessing deep property on null', () => {
    const nestedNull = { user: { profile: null } };
    mockGetData.mockReturnValue(nestedNull);
    const expectedMessage = `Error: Cannot access property 'name' on non-object value at path 'user.profile'. Value is: null`;
    expect(get('user.profile.name', env)).toBe(expectedMessage);
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });
});
