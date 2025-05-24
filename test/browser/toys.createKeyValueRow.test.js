/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { createKeyValueRow } from '../../src/browser/toys.js';

describe('createKeyValueRow', () => {
  let mockDom;
  let mockEntries;
  let mockTextInput;
  let mockRows;
  let mockSyncHiddenField;
  let mockDisposers;
  let mockRender;
  let mockContainer;
  let rowCreator;

  beforeEach(() => {
    // Setup mock DOM utilities
    mockDom = {
      createElement: jest.fn().mockImplementation(() => ({
        _dispose: jest.fn(),
        value: '',
        placeholder: ''
      })),
      setClassName: jest.fn(),
      setType: jest.fn(),
      setTextContent: jest.fn(),
      setPlaceholder: jest.fn(),
      setDataAttribute: jest.fn(),
      getDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn().mockImplementation(el => el.value),
      setValue: jest.fn().mockImplementation((el, value) => { el.value = value; }),
      removeEventListener: jest.fn()
    };

    // Setup mock entries (key-value pairs)
    mockEntries = [
      ['key1', 'value1'],
      ['key2', 'value2']
    ];

    // Setup mock text input
    mockTextInput = document.createElement('input');

    // Setup mock rows object
    mockRows = {
      key1: 'value1',
      key2: 'value2'
    };

    // Setup mock sync function
    mockSyncHiddenField = jest.fn();

    // Setup mock disposers array
    mockDisposers = [];

    // Setup mock render function
    mockRender = jest.fn();

    // Setup mock container
    mockContainer = document.createElement('div');

    // Create the row creator function
    rowCreator = createKeyValueRow(
      mockDom,
      mockEntries,
      mockTextInput,
      mockRows,
      mockSyncHiddenField,
      mockDisposers,
      mockRender,
      mockContainer
    );
  });

  it('creates a row with key and value inputs', () => {
    // Call the row creator with the first entry
    rowCreator(mockEntries[0], 0);

    // Verify the row element was created with the correct class
    expect(mockDom.createElement).toHaveBeenCalledWith('div');
    expect(mockDom.setClassName).toHaveBeenCalledWith(expect.any(Object), 'kv-row');

    // Verify key and value elements were created
    expect(mockDom.createElement).toHaveBeenCalledWith('input');
    expect(mockDom.setType).toHaveBeenCalledWith(expect.any(Object), 'text');

    // Verify the button was created and set up
    expect(mockDom.setTextContent).toHaveBeenCalledWith(expect.any(Object), expect.any(String));

    // Verify elements were appended to the row and the row was appended to the container
    expect(mockDom.appendChild).toHaveBeenCalledTimes(4); // row + 3 children + container.appendChild(row)
  });

  it('creates a remove button for non-last rows', () => {
    // Call with the first entry (not the last one)
    rowCreator(mockEntries[0], 0);

    // Should set up a remove button (×)
    expect(mockDom.setTextContent).toHaveBeenCalledWith(expect.any(Object), '×');
  });

  it('creates an add button for the last row', () => {
    // Call with the last entry
    rowCreator(mockEntries[1], 1);

    // Should set up an add button (+)
    expect(mockDom.setTextContent).toHaveBeenCalledWith(expect.any(Object), '+');
  });

  it('adds event listeners for key and value changes', () => {
    // Call the row creator
    rowCreator(mockEntries[0], 0);

    // Should add input event listeners for both key and value
    expect(mockDom.addEventListener).toHaveBeenCalledWith(
      expect.any(Object),
      'input',
      expect.any(Function)
    );

    // Should add click event listener for the button
    expect(mockDom.addEventListener).toHaveBeenCalledWith(
      expect.any(Object),
      'click',
      expect.any(Function)
    );
  });

  it('adds cleanup functions to disposers array', () => {
    // Initial disposers count
    const initialDisposersCount = mockDisposers.length;

    // Call the row creator
    rowCreator(mockEntries[0], 0);

    // Should have added cleanup functions to disposers
    expect(mockDisposers.length).toBeGreaterThan(initialDisposersCount);

    // Each cleanup function should be a function
    mockDisposers.slice(initialDisposersCount).forEach(disposer => {
      expect(disposer).toBeInstanceOf(Function);
    });
  });

  it('handles cleanup when disposers are called', () => {
    // Call the row creator
    rowCreator(mockEntries[0], 0);

    // Get all cleanup functions
    const cleanupFunctions = [...mockDisposers];

    // Call each cleanup function
    cleanupFunctions.forEach(cleanup => cleanup());

    // Verify removeEventListener was called for each cleanup
    expect(mockDom.removeEventListener).toHaveBeenCalled();
  });
});
