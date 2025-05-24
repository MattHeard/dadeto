/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { createKeyElement } from '../../src/browser/toys.js';

describe('createKeyElement', () => {
  let mockDom;
  let keyEl;
  let textInput;
  let rows;
  let syncHiddenField;
  let disposers;

  beforeEach(() => {
    // Create a mock DOM utilities object
    mockDom = {
      createElement: jest.fn().mockImplementation(() => document.createElement('input')),
      setType: jest.fn((element, type) => {
        element.type = type;
      }),
      setPlaceholder: jest.fn((element, placeholder) => {
        element.placeholder = placeholder;
      }),
      setValue: jest.fn((element, value) => {
        element.value = value;
      }),
      setDataAttribute: jest.fn((element, name, value) => {
        element.dataset[name] = value;
      }),
      addEventListener: jest.fn((element, event, handler) => {
        element.addEventListener(event, handler);
      }),
      removeEventListener: jest.fn((element, event, handler) => {
        element.removeEventListener(event, handler);
      }),
      getDataAttribute: jest.fn((element, name) => element.dataset[name]),
      getTargetValue: jest.fn((event) => event.target.value)
    };

    // Create a mock text input element
    textInput = document.createElement('input');
    textInput.type = 'hidden';

    // Initialize rows object
    rows = { 'existingKey': 'existingValue' };

    // Mock syncHiddenField function
    syncHiddenField = jest.fn();

    // Initialize disposers array
    disposers = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a key input element with the correct initial properties', () => {
    const initialKey = 'testKey';

    keyEl = createKeyElement(mockDom, initialKey, textInput, rows, syncHiddenField, disposers);

    // Verify element creation
    expect(mockDom.createElement).toHaveBeenCalledWith('input');

    // Verify element properties
    expect(keyEl.type).toBe('text');
    expect(keyEl.placeholder).toBe('Key');
    expect(keyEl.value).toBe(initialKey);

    // Verify data attribute was set
    expect(mockDom.setDataAttribute).toHaveBeenCalledWith(
      keyEl,
      'prevKey',
      initialKey
    );
  });

  it('sets up an input event listener on the key element', () => {
    keyEl = createKeyElement(mockDom, 'testKey', textInput, rows, syncHiddenField, disposers);

    // Verify event listener was added
    expect(mockDom.addEventListener).toHaveBeenCalledWith(
      keyEl,
      'input',
      expect.any(Function)
    );

    // Verify disposer was added
    expect(disposers).toHaveLength(1);
    expect(disposers[0]).toBeInstanceOf(Function);
  });

  it('updates the rows object and syncs when key is changed', () => {
    const initialKey = 'initialKey';
    const newKey = 'newKey';
    const initialValue = 'initialValue';

    // Set up initial state
    rows[initialKey] = initialValue;

    // Create the key element
    keyEl = createKeyElement(mockDom, initialKey, textInput, rows, syncHiddenField, disposers);

    // Get the input event handler
    const inputHandler = mockDom.addEventListener.mock.calls[0][2];

    // Simulate changing the key
    keyEl.value = newKey;
    const mockEvent = { target: keyEl };
    inputHandler(mockEvent);

    // Verify the rows object was updated
    expect(rows).not.toHaveProperty(initialKey);
    expect(rows[newKey]).toBe(initialValue);

    // Verify syncHiddenField was called
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rows, mockDom);

    // Verify the prevKey data attribute was updated
    expect(mockDom.setDataAttribute).toHaveBeenCalledWith(
      keyEl,
      'prevKey',
      newKey
    );
  });

  it('handles empty key input correctly', () => {
    const initialKey = 'testKey';
    const emptyKey = '';

    // Set up initial state
    rows[initialKey] = 'someValue';

    // Create the key element
    keyEl = createKeyElement(mockDom, initialKey, textInput, rows, syncHiddenField, disposers);

    // Get the input event handler
    const inputHandler = mockDom.addEventListener.mock.calls[0][2];

    // Simulate changing the key to empty
    keyEl.value = emptyKey;
    const mockEvent = { target: keyEl };
    inputHandler(mockEvent);

    // Verify the rows object was updated with empty key
    // Note: The function doesn't allow empty keys, so it should keep the original key
    expect(rows).toHaveProperty(initialKey);
    expect(rows[initialKey]).toBe('someValue');
    expect(rows).not.toHaveProperty(emptyKey);

    // Verify syncHiddenField was called
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rows, mockDom);
  });

  it('handles key renaming without duplicating entries', () => {
    const initialKey = 'key1';
    const newKey = 'key2';
    const initialValue = 'value1';

    // Set up initial state with two entries
    rows[initialKey] = initialValue;
    rows[newKey] = 'value2';

    // Create the key element for the first key
    keyEl = createKeyElement(mockDom, initialKey, textInput, rows, syncHiddenField, disposers);

    // Get the input event handler
    const inputHandler = mockDom.addEventListener.mock.calls[0][2];

    // Simulate renaming the key to an existing key
    keyEl.value = newKey;
    const mockEvent = { target: keyEl };
    inputHandler(mockEvent);

    // Verify the rows object was updated correctly
    // The function should keep both keys to prevent data loss
    expect(rows).toHaveProperty(newKey);
    expect(rows[newKey]).toBe('value2'); // Should keep the existing value for the new key
    expect(rows).toHaveProperty(initialKey); // Should keep the original key
    expect(rows[initialKey]).toBe(initialValue); // Should keep the original value

    // Verify syncHiddenField was called
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rows, mockDom);
  });

  it('cleans up event listeners when disposer is called', () => {
    keyEl = createKeyElement(mockDom, 'testKey', textInput, rows, syncHiddenField, disposers);

    // Get the disposer function
    const disposer = disposers[0];

    // Call the disposer
    disposer();

    // Verify removeEventListener was called with the correct arguments
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      keyEl,
      'input',
      expect.any(Function)
    );
  });
});
