import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { setTemporary } from '../../../src/toys/2025-03-29/setTemporary.js';

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
      ['setData', mockSetData] // Add setData mock to env
    ]);
  });

  test('should call setData with merged JSON when temporary exists', () => {
    // Modify initialData for this test case before freezing (or create a new one)
    initialData = Object.freeze({
        existing: 'value',
        temporary: { initial: 'data' }
    });
    mockGetData.mockReturnValue(initialData);

    const inputJson = JSON.stringify({ newKey: 'newValue', initial: 'overwritten' });
    const expectedFinalData = {
      existing: 'value',
      temporary: { initial: 'overwritten', newKey: 'newValue' }
    };
    
    const result = setTemporary(inputJson, env);

    expect(result).toBe('Success: Temporary data updated.');
    expect(mockGetData).toHaveBeenCalledTimes(1);
    expect(mockSetData).toHaveBeenCalledTimes(1);
    // Use expect.objectContaining or toEqual for deep comparison
    expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining(expectedFinalData));
    // Ensure the object passed to setData is not the same ref as initialData
    expect(mockSetData.mock.calls[0][0]).not.toBe(initialData);
    // Ensure the temporary object within is also a new reference
    if(initialData.temporary) {
        expect(mockSetData.mock.calls[0][0].temporary).not.toBe(initialData.temporary);
    }
  });

  test('should call setData creating temporary if it does not exist', () => {
    // initialData already lacks temporary from beforeEach
    const inputJson = JSON.stringify({ firstKey: 123 });
    const expectedFinalData = {
        existing: 'value',
        temporary: { firstKey: 123 }
    };

    const result = setTemporary(inputJson, env);

    expect(result).toBe('Success: Temporary data updated.');
    expect(mockGetData).toHaveBeenCalledTimes(1);
    expect(mockSetData).toHaveBeenCalledTimes(1);
    expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining(expectedFinalData));
    expect(mockSetData.mock.calls[0][0]).not.toBe(initialData);
  });

  test('should call setData creating temporary if it exists but is not a valid object', () => {
    initialData = Object.freeze({ existing: 'value', temporary: 'a string' });
    mockGetData.mockReturnValue(initialData);
    const inputJson = JSON.stringify({ key: 'val' });
    const expectedFinalData = { existing: 'value', temporary: { key: 'val' } };

    const result = setTemporary(inputJson, env);
    expect(result).toBe('Success: Temporary data updated.');
    expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining(expectedFinalData));
    expect(mockSetData.mock.calls[0][0]).not.toBe(initialData);

    // Try with null
    initialData = Object.freeze({ existing: 'value', temporary: null });
    mockGetData.mockReturnValue(initialData);
    const inputJson2 = JSON.stringify({ another: true });
    const expectedFinalData2 = { existing: 'value', temporary: { another: true } };
    const result2 = setTemporary(inputJson2, env);
    expect(result2).toBe('Success: Temporary data updated.');
    expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining(expectedFinalData2));
    expect(mockSetData.mock.calls[1][0]).not.toBe(initialData);
    
    // Try with array
    initialData = Object.freeze({ existing: 'value', temporary: [1,2] });
    mockGetData.mockReturnValue(initialData);
    const inputJson3 = JSON.stringify({ third: 3 });
    const expectedFinalData3 = { existing: 'value', temporary: { third: 3 } };
    const result3 = setTemporary(inputJson3, env);
    expect(result3).toBe('Success: Temporary data updated.');
    expect(mockSetData).toHaveBeenCalledWith(expect.objectContaining(expectedFinalData3));
    expect(mockSetData.mock.calls[2][0]).not.toBe(initialData);
    
    expect(mockGetData).toHaveBeenCalledTimes(3);
    expect(mockSetData).toHaveBeenCalledTimes(3);
  });

  test('should return error for invalid JSON input and not call setData', () => {
    const input = 'not json';
    const result = setTemporary(input, env);
    expect(result).toMatch(/^Error: Invalid JSON input./);
    expect(mockGetData).not.toHaveBeenCalled();
    expect(mockSetData).not.toHaveBeenCalled(); // Verify setData not called
  });

  test('should return error if input JSON is not a plain object and not call setData', () => {
    let input = JSON.stringify([1, 2, 3]); // Array
    expect(setTemporary(input, env)).toBe("Error: Input JSON must be a plain object.");
    expect(mockGetData).not.toHaveBeenCalled();
    expect(mockSetData).not.toHaveBeenCalled();
  });

  test('should return error if getData or setData function is missing in env', () => {
    env.delete('getData');
    expect(setTemporary('{}', env)).toBe("Error: 'getData' function not found in env.");
    env.set('getData', mockGetData).delete('setData'); // Restore getData, remove setData
    expect(setTemporary('{}', env)).toBe("Error: 'setData' function not found in env.");
  });

  test('should return error if getData does not return an object and not call setData', () => {
    mockGetData.mockReturnValue('not an object');
    expect(setTemporary('{}', env)).toBe("Error: 'getData' did not return a valid object.");
    expect(mockSetData).not.toHaveBeenCalled();
  });

  test('should return error if getData throws an error and not call setData', () => {
    const errorMessage = 'Failed to retrieve data';
    mockGetData.mockImplementation(() => { throw new Error(errorMessage); });
    expect(setTemporary('{ "a": 1 }', env)).toBe(`Error updating temporary data: ${errorMessage}`);
    expect(mockSetData).not.toHaveBeenCalled();
  });

  test('should return error if setData throws an error', () => {
      const errorMessage = 'Failed to save data';
      mockSetData.mockImplementation(() => { throw new Error(errorMessage); });
      const inputJson = JSON.stringify({ key: 'value' });
      expect(setTemporary(inputJson, env)).toBe(`Error updating temporary data: ${errorMessage}`);
      expect(mockGetData).toHaveBeenCalledTimes(1); // getData was called
      expect(mockSetData).toHaveBeenCalledTimes(1); // setData was called (and threw)
  });
});
