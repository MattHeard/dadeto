import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createOnAddHandler } from '../../src/browser/toys.js';

describe('createOnAddHandler', () => {
  let rows;
  let rowTypes;
  let render;
  let handler;

  beforeEach(() => {
    // Initialize test data before each test
    rows = {};
    rowTypes = {};
    render = jest.fn();
    handler = createOnAddHandler(rows, rowTypes, render);
  });

  it('adds an empty key-value pair when no empty key exists', () => {
    // Initially, rows should be empty
    expect(Object.keys(rows)).toHaveLength(0);

    // Call the handler
    handler();

    // Should add an empty key
    expect(rows).toHaveProperty('');
    expect(rows['']).toBe('');

    // Should seed rowTypes for the new empty key
    expect(rowTypes['']).toBe('string');

    // Should call render to update the UI
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('does not add a new empty key if one already exists', () => {
    // Add an empty key first
    rows[''] = 'existing';

    // Call the handler
    handler();

    // Should not modify the rows object
    expect(rows).toEqual({ '': 'existing' });

    // Should not call render again
    expect(render).toHaveBeenCalledTimes(0);
  });

  it('preserves existing non-empty keys when adding an empty key', () => {
    // Add some existing keys
    rows.key1 = 'value1';
    rows.key2 = 'value2';

    // Call the handler
    handler();

    // Should add an empty key while preserving existing ones
    expect(rows).toEqual({
      key1: 'value1',
      key2: 'value2',
      '': '',
    });

    // Should seed rowTypes for the new empty key
    expect(rowTypes['']).toBe('string');

    // Should call render to update the UI
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('does not add an empty key if one exists, even with other keys', () => {
    // Add an empty key and some other keys
    rows[''] = 'existing';
    rows.key1 = 'value1';

    // Call the handler
    handler();

    // Should not modify the rows object
    expect(rows).toEqual({
      '': 'existing',
      key1: 'value1',
    });

    // Should not call render
    expect(render).toHaveBeenCalledTimes(0);
  });
});
