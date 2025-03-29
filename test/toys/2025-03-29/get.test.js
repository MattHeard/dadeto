import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { get } from '../../../src/toys/2025-03-29/get.js';

describe('get function', () => {
  let mockGetData;
  let env;

  beforeEach(() => {
    // Reset mocks and environment before each test
    mockGetData = jest.fn();
    env = new Map([
      ['getData', mockGetData]
    ]);
  });

  test('should return the value for a valid key', () => {
    const testData = { name: 'Alice', age: 30 };
    mockGetData.mockReturnValue(testData);
    expect(get('name', env)).toBe(JSON.stringify('Alice'));
    expect(get('age', env)).toBe(JSON.stringify(30));
    expect(mockGetData).toHaveBeenCalledTimes(2); // Ensure getData was called
  });

  test('should return an error if the key does not exist', () => {
    const testData = { city: 'London' };
    mockGetData.mockReturnValue(testData);
    const expectedErrorMessage = `Error: Key "country" not found in data. Available keys: city`;
    expect(get('country', env)).toBe(expectedErrorMessage);
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should return an error if getData is not a function', () => {
    env.set('getData', 'not a function');
    expect(get('anyKey', env)).toBe("Error: 'getData' function not found in env.");
  });

  test('should return an error if env map is not provided or invalid', () => {
    expect(get('anyKey', null)).toBe("Error: 'env' Map with 'get' method is required.");
    expect(get('anyKey', {})).toBe("Error: 'env' Map with 'get' method is required."); // Plain object is not a Map
  });

  test('should return an error if getData does not return a plain object', () => {
    mockGetData.mockReturnValue('a string');
    expect(get('anyKey', env)).toBe("Error: 'getData' did not return a valid plain object.");

    mockGetData.mockReturnValue(null);
    expect(get('anyKey', env)).toBe("Error: 'getData' did not return a valid plain object.");

    mockGetData.mockReturnValue([1, 2, 3]); // Array is not a plain object for this purpose
    expect(get('anyKey', env)).toBe("Error: 'getData' did not return a valid plain object.");

    expect(mockGetData).toHaveBeenCalledTimes(3);
  });

  test('should return an error if getData throws an error', () => {
    const errorMessage = 'Failed to fetch data';
    mockGetData.mockImplementation(() => {
      throw new Error(errorMessage);
    });
    expect(get('anyKey', env)).toBe(`Error calling getData or accessing data: ${errorMessage}`);
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should handle complex objects correctly', () => {
    const complexData = { user: { id: 1, details: { active: true } } };
    mockGetData.mockReturnValue(complexData);
    expect(get('user', env)).toBe(JSON.stringify({ id: 1, details: { active: true } }));
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });

  test('should handle non-stringifiable values (like circular refs) gracefully', () => {
    const circular = {};
    circular.myself = circular;
    const testData = { circularRef: circular }; // JSON.stringify will throw on this
    mockGetData.mockReturnValue(testData);
    expect(get('circularRef', env)).toMatch(/^Error stringifying value for key "circularRef":/);
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });
});
