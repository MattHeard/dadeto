import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { setTemporary } from '../../../src/core/toys/2025-03-29/setTemporary.js';

describe('setTemporary function (getData -> merge -> setData)', () => {
  let mockGetData;
  let mockSetData;
  let initialData; // The object returned by mockGetData
  let env;

  beforeEach(() => {
    // Start with fresh, potentially immutable data for getData
    initialData = Object.freeze({
      existing: 'value',
      // 'temporary' might exist or not initially
    });
    mockGetData = jest.fn().mockReturnValue(initialData);
    mockSetData = jest.fn(); // Mock for setData
    env = new Map([
      ['getData', mockGetData],
      ['setLocalTemporaryData', mockSetData], // Add setData mock to env
    ]);
  });

  test('should call setLocalTemporaryData with merged JSON when temporary exists', () => {
    // Modify initialData for this test case before freezing (or create a new one)
    initialData = Object.freeze({
      existing: 'value',
      temporary: { initial: 'data' },
    });
    mockGetData.mockReturnValue(initialData);

    const inputJson = JSON.stringify({
      newKey: 'newValue',
      initial: 'overwritten',
    });
    const expectedFinalData = {
      existing: 'value',
      temporary: { initial: 'overwritten', newKey: 'newValue' },
    };

    const result = setTemporary(inputJson, env);

    expect(result).toBe('Success: Temporary data deep merged.'); // Updated message
    expect(mockGetData).toHaveBeenCalledTimes(1);
    expect(mockSetData).toHaveBeenCalledTimes(1);
    // Use expect.objectContaining or toEqual for deep comparison
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining(expectedFinalData)
    );
    // Ensure the object passed to setData is not the same ref as initialData
    expect(mockSetData.mock.calls[0][0]).not.toBe(initialData);
    // Ensure the temporary object within is also a new reference
    if (initialData.temporary) {
      expect(mockSetData.mock.calls[0][0].temporary).not.toBe(
        initialData.temporary
      );
    }
  });

  test('should call setLocalTemporaryData creating temporary if it does not exist', () => {
    // initialData already lacks temporary from beforeEach
    const inputJson = JSON.stringify({ firstKey: 123 });
    const expectedFinalData = {
      existing: 'value',
      temporary: { firstKey: 123 },
    };

    const result = setTemporary(inputJson, env);

    expect(result).toBe('Success: Temporary data deep merged.'); // Updated message
    expect(mockGetData).toHaveBeenCalledTimes(1);
    expect(mockSetData).toHaveBeenCalledTimes(1);
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining(expectedFinalData)
    );
    expect(mockSetData.mock.calls[0][0]).not.toBe(initialData);
  });

  test('should call setLocalTemporaryData creating temporary if it exists but is not a valid object', () => {
    initialData = Object.freeze({ existing: 'value', temporary: 'a string' });
    mockGetData.mockReturnValue(initialData);
    const inputJson = JSON.stringify({ key: 'val' });
    const expectedFinalData = { existing: 'value', temporary: { key: 'val' } };

    const result = setTemporary(inputJson, env);
    expect(result).toBe('Success: Temporary data deep merged.'); // Updated message
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining(expectedFinalData)
    );
    expect(mockSetData.mock.calls[0][0]).not.toBe(initialData);

    // Try with null
    initialData = Object.freeze({ existing: 'value', temporary: null });
    mockGetData.mockReturnValue(initialData);
    const inputJson2 = JSON.stringify({ another: true });
    const expectedFinalData2 = {
      existing: 'value',
      temporary: { another: true },
    };
    const result2 = setTemporary(inputJson2, env);
    expect(result2).toBe('Success: Temporary data deep merged.'); // Updated message
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining(expectedFinalData2)
    );
    expect(mockSetData.mock.calls[1][0]).not.toBe(initialData);

    // Try with array
    initialData = Object.freeze({ existing: 'value', temporary: [1, 2] });
    mockGetData.mockReturnValue(initialData);
    const inputJson3 = JSON.stringify({ third: 3 });
    const expectedFinalData3 = { existing: 'value', temporary: { third: 3 } };
    const result3 = setTemporary(inputJson3, env);
    expect(result3).toBe('Success: Temporary data deep merged.'); // Updated message
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining(expectedFinalData3)
    );
    expect(mockSetData.mock.calls[2][0]).not.toBe(initialData);

    expect(mockGetData).toHaveBeenCalledTimes(3);
    expect(mockSetData).toHaveBeenCalledTimes(3);
  });

  test('should return error for invalid JSON input and not call setLocalTemporaryData', () => {
    const input = 'not json';
    const result = setTemporary(input, env);
    expect(result).toMatch(/^Error: Invalid JSON input./);
    expect(mockGetData).not.toHaveBeenCalled();
    expect(mockSetData).not.toHaveBeenCalled(); // Verify setData not called
  });

  test('should return error if input JSON is not a plain object and not call setLocalTemporaryData', () => {
    const input = JSON.stringify([1, 2, 3]); // Array
    expect(setTemporary(input, env)).toBe(
      'Error: Input JSON must be a plain object.'
    );
    expect(mockGetData).not.toHaveBeenCalled();
    expect(mockSetData).not.toHaveBeenCalled();
  });

  test('should return error if getData throws an error and not call setLocalTemporaryData', () => {
    const errorMessage = 'Failed to retrieve data';
    mockGetData.mockImplementation(() => {
      throw new Error(errorMessage);
    });
    expect(setTemporary('{ "a": 1 }', env)).toBe(
      `Error updating temporary data: ${errorMessage}`
    );
    expect(mockSetData).not.toHaveBeenCalled();
  });

  test('should return error if setData throws an error', () => {
    const errorMessage = 'Failed to save data';
    mockSetData.mockImplementation(() => {
      throw new Error(errorMessage);
    });
    const inputJson = JSON.stringify({ key: 'value' });
    expect(setTemporary(inputJson, env)).toBe(
      `Error updating temporary data: ${errorMessage}`
    );
    expect(mockGetData).toHaveBeenCalledTimes(1); // getData was called
    expect(mockSetData).toHaveBeenCalledTimes(1); // setData was called (and threw)
  });

  test('should deep merge nested objects within temporary', () => {
    initialData = Object.freeze({
      existing: 'value',
      temporary: {
        level1: {
          a: 1,
          b: { c: 2 },
        },
        other: 'abc',
      },
    });
    mockGetData.mockReturnValue(initialData);

    const inputJson = JSON.stringify({
      level1: {
        b: { d: 3 }, // This should merge with existing level1.b, not replace it
        e: 4, // This should be added to level1
      },
      newProp: true, // Add a new top-level prop to temporary
    });

    const expectedFinalData = {
      existing: 'value',
      temporary: {
        level1: {
          a: 1, // Preserved from initial
          b: { c: 2, d: 3 }, // Merged
          e: 4, // Added
        },
        other: 'abc', // Preserved from initial
        newProp: true, // Added
      },
    };

    const result = setTemporary(inputJson, env);

    expect(result).toBe('Success: Temporary data deep merged.'); // Updated message
    expect(mockGetData).toHaveBeenCalledTimes(1);
    expect(mockSetData).toHaveBeenCalledTimes(1);
    // Use toEqual for deep comparison of the final object structure
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining(expectedFinalData)
    ); // Check overall structure
    expect(mockSetData.mock.calls[0][0].temporary).toEqual(
      expectedFinalData.temporary
    ); // Deep check temporary specifically
    // Check that references were changed (deep clone + merge creates new objects)
    expect(mockSetData.mock.calls[0][0]).not.toBe(initialData);
    expect(mockSetData.mock.calls[0][0].temporary).not.toBe(
      initialData.temporary
    );
    expect(mockSetData.mock.calls[0][0].temporary.level1).not.toBe(
      initialData.temporary.level1
    );
    expect(mockSetData.mock.calls[0][0].temporary.level1.b).not.toBe(
      initialData.temporary.level1.b
    );
  });

  test('should overwrite non-object properties during deep merge', () => {
    initialData = Object.freeze({
      temporary: { a: 1, b: 'string', c: [1, 2] },
    });
    mockGetData.mockReturnValue(initialData);

    const inputJson = JSON.stringify({
      a: { nested: true }, // Overwrite number with object
      b: 2, // Overwrite string with number
      c: { d: 3 }, // Overwrite array with object
    });

    const expectedTemporary = {
      a: { nested: true },
      b: 2,
      c: { d: 3 },
    };

    setTemporary(inputJson, env);
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ temporary: expectedTemporary })
    );
  });

  test('should handle merging onto an empty initial temporary object', () => {
    initialData = Object.freeze({ existing: 'value', temporary: {} });
    mockGetData.mockReturnValue(initialData);
    const inputJson = JSON.stringify({ level1: { a: 1 } });
    const expectedTemporary = { level1: { a: 1 } };

    setTemporary(inputJson, env);
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ temporary: expectedTemporary })
    );
  });

  test('should handle merging onto a non-existent initial temporary object', () => {
    initialData = Object.freeze({ existing: 'value' }); // No temporary key
    mockGetData.mockReturnValue(initialData);
    const inputJson = JSON.stringify({ level1: { a: 1 } });
    const expectedTemporary = { level1: { a: 1 } };

    setTemporary(inputJson, env);
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ temporary: expectedTemporary })
    );
  });

  test('should preserve existing temporary data if source is not object', () => {
    initialData = Object.freeze({
      existing: 'value',
      temporary: { key: 'val' },
    });
    mockGetData.mockReturnValue(initialData);

    const inputJson = JSON.stringify(null); // Valid JSON but not an object

    const result = setTemporary(inputJson, env);
    expect(result).toBe('Error: Input JSON must be a plain object.');
    expect(mockSetData).not.toHaveBeenCalled();
  });

  test('should overwrite non-object temporary with object from input', () => {
    initialData = Object.freeze({ existing: 'value', temporary: 42 });
    mockGetData.mockReturnValue(initialData);
    const inputJson = JSON.stringify({ newKey: 'newVal' });

    const expected = { existing: 'value', temporary: { newKey: 'newVal' } };
    const result = setTemporary(inputJson, env);
    expect(result).toBe('Success: Temporary data deep merged.');
    expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining(expected));
  });
});
