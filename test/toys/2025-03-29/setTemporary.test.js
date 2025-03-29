import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { setTemporary } from '../../../src/toys/2025-03-29/setTemporary.js';

describe('setTemporary function (JSON merge)', () => {
  let mockGetData;
  let mockData; // The mutable object returned by mockGetData
  let env;

  beforeEach(() => {
    // Start with fresh, mutable data for each test
    mockData = {
      existing: 'value',
      // 'temporary' might exist or not initially
    };
    mockGetData = jest.fn().mockReturnValue(mockData);
    env = new Map([
      ['getData', mockGetData]
    ]);
  });

  test('should merge valid JSON input into data.temporary (when temporary exists)', () => {
    mockData.temporary = { initial: 'data' }; // Pre-existing temporary data
    const inputJson = JSON.stringify({ newKey: 'newValue', initial: 'overwritten' });
    
    const result = setTemporary(inputJson, env);

    expect(result).toBe('Success: Input JSON merged into temporary data.');
    expect(mockGetData).toHaveBeenCalledTimes(1);
    expect(mockData.temporary).toEqual({ initial: 'overwritten', newKey: 'newValue' });
    expect(mockData.existing).toBe('value'); // Ensure other data is untouched
  });

  test('should create data.temporary and merge JSON if temporary does not exist', () => {
    expect(mockData.temporary).toBeUndefined(); // Verify it doesn't exist initially
    const inputJson = JSON.stringify({ firstKey: 123 });

    const result = setTemporary(inputJson, env);

    expect(result).toBe('Success: Input JSON merged into temporary data.');
    expect(mockGetData).toHaveBeenCalledTimes(1);
    expect(mockData.temporary).toEqual({ firstKey: 123 });
  });

  test('should create data.temporary if it exists but is not a valid object', () => {
    mockData.temporary = 'a string'; // Invalid temporary data
    const inputJson = JSON.stringify({ key: 'val' });

    const result = setTemporary(inputJson, env);

    expect(result).toBe('Success: Input JSON merged into temporary data.');
    expect(mockData.temporary).toEqual({ key: 'val' });

    // Try with null
    mockData.temporary = null;
    const inputJson2 = JSON.stringify({ another: true });
    const result2 = setTemporary(inputJson2, env);
    expect(result2).toBe('Success: Input JSON merged into temporary data.');
    expect(mockData.temporary).toEqual({ another: true });
    
    // Try with array
    mockData.temporary = [1,2];
    const inputJson3 = JSON.stringify({ third: 3 });
    const result3 = setTemporary(inputJson3, env);
    expect(result3).toBe('Success: Input JSON merged into temporary data.');
    expect(mockData.temporary).toEqual({ third: 3 });
    
    expect(mockGetData).toHaveBeenCalledTimes(3);
  });

  test('should return error for invalid JSON input', () => {
    const input = 'not json';
    const result = setTemporary(input, env);
    expect(result).toMatch(/^Error: Invalid JSON input./);
    expect(mockGetData).not.toHaveBeenCalled();
  });

  test('should return error if input JSON is not a plain object', () => {
    let input = JSON.stringify([1, 2, 3]); // Array
    expect(setTemporary(input, env)).toBe("Error: Input JSON must be a plain object.");

    input = JSON.stringify('a string'); // String
    expect(setTemporary(input, env)).toBe("Error: Input JSON must be a plain object.");

    input = JSON.stringify(null); // Null
    expect(setTemporary(input, env)).toBe("Error: Input JSON must be a plain object.");

    expect(mockGetData).not.toHaveBeenCalled();
  });

  test('should return error if getData function is missing in env', () => {
    env.delete('getData');
    const result = setTemporary('{}', env);
    expect(result).toBe("Error: 'getData' function not found in env.");
  });

  test('should return error if getData does not return an object', () => {
    mockGetData.mockReturnValue('not an object');
    const result = setTemporary('{}', env);
    expect(result).toBe("Error: 'getData' did not return a valid object.");

    mockGetData.mockReturnValue(null);
    const result2 = setTemporary('{}', env);
    expect(result2).toBe("Error: 'getData' did not return a valid object.");
    expect(mockGetData).toHaveBeenCalledTimes(2);
  });

  test('should return error if getData throws an error', () => {
    const errorMessage = 'Failed to retrieve data';
    mockGetData.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const result = setTemporary('{ "a": 1 }', env);
    expect(result).toBe(`Error accessing or updating temporary data: ${errorMessage}`);
    expect(mockGetData).toHaveBeenCalledTimes(1);
  });
  
  test('should handle empty JSON object input', () => {
    mockData.temporary = { initial: 'data' };
    const inputJson = JSON.stringify({});
    
    const result = setTemporary(inputJson, env);

    expect(result).toBe('Success: Input JSON merged into temporary data.');
    expect(mockGetData).toHaveBeenCalledTimes(1);
    // Expect temporary data to remain unchanged as nothing was merged
    expect(mockData.temporary).toEqual({ initial: 'data' });
  });
});
