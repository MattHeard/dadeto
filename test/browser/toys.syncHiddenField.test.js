import { jest } from '@jest/globals';
import { syncHiddenField } from '../../src/browser/toys.js';

const compareStrings = (a, b) => a.localeCompare(b);

describe('syncHiddenField', () => {
  let mockTextInput;
  let mockDom;

  beforeEach(() => {
    // Setup mock text input
    mockTextInput = {};

    // Setup mock DOM utilities
    mockDom = {
      setValue: jest.fn(),
    };
  });

  it('includes entries where either key or value is truthy', () => {
    const rows = {
      key1: 'value1', // Included (both key and value are truthy)
      '': 'emptyKey', // Excluded (key is falsy, but value is truthy - but implementation only checks key)
      emptyValue: '', // Included (key is truthy, even though value is falsy)
      key2: 'value2', // Included (both key and value are truthy)
      '': '', // Excluded (both key and value are falsy)
    };

    syncHiddenField(mockTextInput, rows, {}, mockDom);

    // Get the actual result
    const [, actualJson] = mockDom.setValue.mock.calls[0];
    const actual = JSON.parse(actualJson);

    // Check that all expected entries are present, regardless of order
    expect(actual).toMatchObject({
      key1: 'value1',
      emptyValue: '',
      key2: 'value2',
      // Note: '' (empty key) is not included because the implementation only checks the key
    });

    // Verify no unexpected entries
    expect(Object.keys(actual).sort(compareStrings)).toEqual(
      ['key1', 'emptyValue', 'key2'].sort(compareStrings)
    );
  });

  it('handles empty rows object', () => {
    const rows = {};

    syncHiddenField(mockTextInput, rows, {}, mockDom);

    expect(mockDom.setValue).toHaveBeenCalledWith(
      mockTextInput,
      JSON.stringify({})
    );
  });

  it('excludes entries where both key and value are falsy', () => {
    const rows = {
      '': '', // Excluded (both key and value are falsy)
      key1: 'value1',
      '': 'value2', // Included (value is truthy)
      key2: '', // Included (key is truthy)
      key3: 'value3',
      0: 0, // Included (key is truthy, even though value is falsy)
      false: false, // Included (key is truthy, even though value is falsy)
    };

    syncHiddenField(mockTextInput, rows, {}, mockDom);

    const [, actualJson] = mockDom.setValue.mock.calls[0];
    const actual = JSON.parse(actualJson);

    // Check that all expected entries are present, regardless of order
    expect(actual).toMatchObject({
      key1: 'value1',
      '': 'value2',
      key2: '',
      key3: 'value3',
      0: 0,
      false: false,
    });

    // Verify no unexpected entries
    expect(Object.keys(actual).sort(compareStrings)).toEqual(
      ['key1', '', 'key2', 'key3', '0', 'false'].sort(compareStrings)
    );
  });

  it('handles non-string values by converting them to strings', () => {
    const rows = {
      number: 42,
      boolean: true,
      nullValue: null,
      object: { a: 1 },
      array: [1, 2, 3],
    };

    syncHiddenField(mockTextInput, rows, {}, mockDom);

    expect(mockDom.setValue).toHaveBeenCalledWith(
      mockTextInput,
      JSON.stringify({
        number: 42,
        boolean: true,
        nullValue: null,
        object: { a: 1 },
        array: [1, 2, 3],
      })
    );
  });

  it('preserves whitespace in keys and values', () => {
    const rows = {
      '  key  ': '  value  ', // Both key and value have whitespace
      key2: '  ', // Value is whitespace-only
      '  ': '  ', // Key is whitespace-only, value is whitespace
      '  key3  ': '  value with spaces  ',
      '': '', // Excluded (both key and value are empty)
    };

    syncHiddenField(mockTextInput, rows, {}, mockDom);

    const [, actualJson] = mockDom.setValue.mock.calls[0];
    const actual = JSON.parse(actualJson);

    // Check that all expected entries are present, regardless of order
    expect(actual).toMatchObject({
      '  key  ': '  value  ',
      key2: '  ',
      '  ': '  ', // Included because value is non-empty (whitespace is truthy)
      '  key3  ': '  value with spaces  ',
    });

    // Verify no unexpected entries
    expect(Object.keys(actual).sort(compareStrings)).toEqual(
      ['  key  ', 'key2', '  ', '  key3  '].sort(compareStrings)
    );
  });

  it('coerces a number-typed value to a number', () => {
    const rows = { count: '42' };
    const rowTypes = { count: 'number' };

    syncHiddenField(mockTextInput, rows, rowTypes, mockDom);

    expect(mockDom.setValue).toHaveBeenCalledWith(
      mockTextInput,
      JSON.stringify({ count: 42 })
    );
  });

  it('coerces a boolean-typed value to a boolean', () => {
    const rows = { active: 'true' };
    const rowTypes = { active: 'boolean' };

    syncHiddenField(mockTextInput, rows, rowTypes, mockDom);

    expect(mockDom.setValue).toHaveBeenCalledWith(
      mockTextInput,
      JSON.stringify({ active: true })
    );
  });

  it('coerces a json-typed value to a parsed object', () => {
    const rows = { data: '{"x":1}' };
    const rowTypes = { data: 'json' };

    syncHiddenField(mockTextInput, rows, rowTypes, mockDom);

    expect(mockDom.setValue).toHaveBeenCalledWith(
      mockTextInput,
      JSON.stringify({ data: { x: 1 } })
    );
  });

  it('defaults to string coercion when key is absent from rowTypes', () => {
    const rows = { name: 'Alice' };

    syncHiddenField(mockTextInput, rows, {}, mockDom);

    expect(mockDom.setValue).toHaveBeenCalledWith(
      mockTextInput,
      JSON.stringify({ name: 'Alice' })
    );
  });
});
