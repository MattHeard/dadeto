import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { setTemporary } from '../../../src/toys/2025-03-29/setTemporary.js';

describe('setTemporary function', () => {
  let mockSetTemporaryData;
  let env;

  beforeEach(() => {
    // Reset mocks and environment before each test
    mockSetTemporaryData = jest.fn();
    env = new Map([
      ['setTemporaryData', mockSetTemporaryData]
    ]);
  });

  test('should call setTemporaryData with correct key and value', () => {
    const input = 'myKey=myValue';
    const expectedKey = 'myKey';
    const expectedValue = 'myValue';

    const result = setTemporary(input, env);

    expect(result).toBe(`Success: Temporary value set for key "${expectedKey}".`);
    expect(mockSetTemporaryData).toHaveBeenCalledTimes(1);
    expect(mockSetTemporaryData).toHaveBeenCalledWith(expectedKey, expectedValue);
  });

  test('should handle values with equals signs correctly', () => {
    const input = 'url=http://example.com?param=value';
    const expectedKey = 'url';
    const expectedValue = 'http://example.com?param=value';

    const result = setTemporary(input, env);

    expect(result).toBe(`Success: Temporary value set for key "${expectedKey}".`);
    expect(mockSetTemporaryData).toHaveBeenCalledTimes(1);
    expect(mockSetTemporaryData).toHaveBeenCalledWith(expectedKey, expectedValue);
  });

  test('should handle leading/trailing whitespace in key', () => {
    const input = '  spacedKey  =some value';
    const expectedKey = 'spacedKey';
    const expectedValue = 'some value';

    const result = setTemporary(input, env);

    expect(result).toBe(`Success: Temporary value set for key "${expectedKey}".`);
    expect(mockSetTemporaryData).toHaveBeenCalledTimes(1);
    expect(mockSetTemporaryData).toHaveBeenCalledWith(expectedKey, expectedValue);
  });
  
    test('should handle empty value', () => {
    const input = 'emptyVal=';
    const expectedKey = 'emptyVal';
    const expectedValue = '';

    const result = setTemporary(input, env);

    expect(result).toBe(`Success: Temporary value set for key "${expectedKey}".`);
    expect(mockSetTemporaryData).toHaveBeenCalledTimes(1);
    expect(mockSetTemporaryData).toHaveBeenCalledWith(expectedKey, expectedValue);
  });

  test('should return error for invalid input format (no equals sign)', () => {
    const input = 'justakey';
    const result = setTemporary(input, env);
    expect(result).toBe("Error: Invalid input format. Please use 'key=value'.");
    expect(mockSetTemporaryData).not.toHaveBeenCalled();
  });

  test('should return error for empty key', () => {
    const input = '=avalue';
    const result = setTemporary(input, env);
    expect(result).toBe("Error: Key cannot be empty. Please use 'key=value'.");
    expect(mockSetTemporaryData).not.toHaveBeenCalled();
  });
    
  test('should return error for whitespace-only key', () => {
    const input = '   =another value';
    const result = setTemporary(input, env);
    expect(result).toBe("Error: Key cannot be empty. Please use 'key=value'.");
    expect(mockSetTemporaryData).not.toHaveBeenCalled();
  });

  test('should return error if env map is missing or invalid', () => {
    expect(setTemporary('k=v', null)).toBe("Error: 'env' Map with 'get' method is required.");
    expect(setTemporary('k=v', {})).toBe("Error: 'env' Map with 'get' method is required.");
    expect(mockSetTemporaryData).not.toHaveBeenCalled();
  });

  test('should return error if setTemporaryData function is missing in env', () => {
    env.delete('setTemporaryData');
    const result = setTemporary('k=v', env);
    expect(result).toBe("Error: 'setTemporaryData' function not found in env.");
    expect(mockSetTemporaryData).not.toHaveBeenCalled();
  });

  test('should return error if setTemporaryData throws an error', () => {
    const errorMessage = 'Storage quota exceeded';
    mockSetTemporaryData.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const input = 'largeKey=largeValue';
    const result = setTemporary(input, env);

    expect(result).toBe(`Error setting temporary data for key "largeKey": ${errorMessage}`);
    expect(mockSetTemporaryData).toHaveBeenCalledTimes(1);
    expect(mockSetTemporaryData).toHaveBeenCalledWith('largeKey', 'largeValue');
  });
});
