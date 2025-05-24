import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { parseExistingRows } from '../../src/browser/toys.js';

describe('parseExistingRows', () => {
  // Mock DOM utilities
  let mockDom;
  let mockInputElement;

  beforeEach(() => {
    mockDom = {
      getValue: jest.fn()
    };
    mockInputElement = {};
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse an empty input as an empty object', () => {
    mockDom.getValue.mockReturnValue('');
    const result = parseExistingRows(mockDom, mockInputElement);
    expect(result).toEqual({});
    expect(mockDom.getValue).toHaveBeenCalledWith(mockInputElement);
  });

  it('should parse a valid JSON object', () => {
    const testObj = { key1: 'value1', key2: 'value2' };
    mockDom.getValue.mockReturnValue(JSON.stringify(testObj));

    const result = parseExistingRows(mockDom, mockInputElement);

    expect(result).toEqual(testObj);
    expect(mockDom.getValue).toHaveBeenCalledWith(mockInputElement);
  });

  it('should convert an array of key-value pairs to an object', () => {
    const testArray = [
      { key: 'name', value: 'John' },
      { key: 'age', value: 30 }
    ];
    mockDom.getValue.mockReturnValue(JSON.stringify(testArray));

    const result = parseExistingRows(mockDom, mockInputElement);

    expect(result).toEqual({
      name: 'John',
      age: 30
    });
  });

  it('should handle arrays with undefined/null values', () => {
    const testArray = [
      { key: 'name', value: 'John' },
      { key: 'age', value: null },
      { key: 'city' } // value is undefined
    ];
    mockDom.getValue.mockReturnValue(JSON.stringify(testArray));

    const result = parseExistingRows(mockDom, mockInputElement);

    expect(result).toEqual({
      name: 'John',
      age: '',
      city: ''
    });
  });

  it('should skip items without a key property in array input', () => {
    const testArray = [
      { key: 'name', value: 'John' },
      { value: 'should be skipped' },
      { key: 'age', value: 30 },
      { notKey: 'test', value: 'should be skipped' }
    ];
    mockDom.getValue.mockReturnValue(JSON.stringify(testArray));

    const result = parseExistingRows(mockDom, mockInputElement);

    expect(result).toEqual({
      name: 'John',
      age: 30
    });
  });

  it('should handle invalid JSON by returning an empty object', () => {
    mockDom.getValue.mockReturnValue('{invalid json');

    const result = parseExistingRows(mockDom, mockInputElement);

    expect(result).toEqual({});
  });

  it('should handle non-object, non-array JSON values by returning an empty object', () => {
    // Test with string
    mockDom.getValue.mockReturnValue('"just a string"');
    expect(parseExistingRows(mockDom, mockInputElement)).toEqual({});

    // Test with number
    mockDom.getValue.mockReturnValue('42');
    expect(parseExistingRows(mockDom, mockInputElement)).toEqual({});

    // Test with null
    mockDom.getValue.mockReturnValue('null');
    expect(parseExistingRows(mockDom, mockInputElement)).toEqual({});

    // Test with boolean
    mockDom.getValue.mockReturnValue('true');
    expect(parseExistingRows(mockDom, mockInputElement)).toEqual({});
  });
});
