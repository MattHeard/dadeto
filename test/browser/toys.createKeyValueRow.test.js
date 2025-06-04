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
      createElement: jest.fn(),
      setClassName: jest.fn(),
      setType: jest.fn(),
      setTextContent: jest.fn(),
      setPlaceholder: jest.fn(),
      setDataAttribute: jest.fn(),
      getDataAttribute: jest.fn(),
      addEventListener: jest.fn(),
      appendChild: jest.fn(),
      getValue: jest.fn(),
      setValue: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Setup mock entries (key-value pairs)
    mockEntries = [
      ['key1', 'value1'],
      ['key2', 'value2'],
    ];

    // Setup mock text input
    mockTextInput = {};

    // Setup mock rows object
    mockRows = {
      key1: 'value1',
      key2: 'value2',
    };

    // Setup mock sync function
    mockSyncHiddenField = jest.fn();

    // Setup mock disposers array
    mockDisposers = [];

    // Setup mock render function
    mockRender = jest.fn();

    // Setup mock container
    mockContainer = {};

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
    // Setup mock elements that will be created
    const mockRowElement = {};
    const mockInputElement = {};

    // Make createElement return our mock elements in order
    mockDom.createElement
      .mockReturnValueOnce(mockRowElement) // First call: row div
      .mockReturnValueOnce(mockInputElement) // Second call: key input
      .mockReturnValueOnce({}) // Third call: value input
      .mockReturnValue({}); // Any other calls

    // Call the row creator function
    const rowElement = rowCreator('key1', 'value1', false);

    // Verify the row element was created with the correct class
    expect(mockDom.createElement).toHaveBeenCalledWith('div');
    expect(mockDom.setClassName).toHaveBeenCalledWith(mockRowElement, 'kv-row');

    // Verify key and value elements were created
    expect(mockDom.createElement).toHaveBeenCalledWith('input');
    expect(mockDom.setType).toHaveBeenCalledWith(mockInputElement, 'text');
    expect(mockDom.setPlaceholder).toHaveBeenCalledWith(
      mockInputElement,
      'Key'
    );
    expect(mockDom.setDataAttribute).toHaveBeenCalledWith(
      mockInputElement,
      'prevKey',
      'k'
    );

    // Verify elements were appended to the row and the row was appended to the container
    expect(mockDom.appendChild).toHaveBeenCalledTimes(4); // row + 3 children + container.appendChild(row)
  });

  it('creates a remove button for non-last rows', () => {
    // Setup mock elements
    const mockButton = {};
    mockDom.createElement
      .mockReturnValueOnce({}) // row div
      .mockReturnValueOnce({}) // key input
      .mockReturnValueOnce({}) // value input
      .mockReturnValue(mockButton); // remove button

    // Call the row creator function with isLast = false
    rowCreator('key1', 'value1', false);

    // Should set up a remove button (×)
    expect(mockDom.setTextContent).toHaveBeenCalledWith(mockButton, '×');
  });

  it('creates an add button for the last row', () => {
    // Setup mock elements
    const mockButton = {};
    mockDom.createElement
      .mockReturnValueOnce({}) // row div
      .mockReturnValueOnce({}) // key input
      .mockReturnValueOnce({}) // value input
      .mockReturnValue(mockButton); // add button

    // Call the row creator function with isLast = true
    rowCreator('key1', 'value1', true);

    // Should set up an add button (×)
    expect(mockDom.setTextContent).toHaveBeenCalledWith(mockButton, '×');
  });

  it('uses the index to set up a remove button when not last', () => {
    const mockButton = {};
    mockDom.createElement
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValue(mockButton);

    rowCreator(mockEntries[0], 0);

    expect(mockDom.setTextContent).toHaveBeenCalledWith(mockButton, '×');
  });

  it('uses the index to set up an add button when last', () => {
    const mockButton = {};
    mockDom.createElement
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValue(mockButton);

    rowCreator(mockEntries[1], 1);

    expect(mockDom.setTextContent).toHaveBeenCalledWith(mockButton, '+');
  });

  it('adds event listeners for key and value changes', () => {
    // Setup mock elements
    const mockKeyInput = {};
    const mockValueInput = {};
    const mockButton = {};

    let inputHandler;

    mockDom.createElement
      .mockReturnValueOnce({}) // row div
      .mockReturnValueOnce(mockKeyInput) // key input
      .mockReturnValueOnce(mockValueInput) // value input
      .mockReturnValue(mockButton); // button

    // Call the row creator function
    rowCreator('key1', 'value1', false);

    // Verify event listeners were added
    expect(mockDom.addEventListener.mock.calls).toEqual([
      [mockKeyInput, 'input', expect.any(Function)],
      [mockValueInput, 'input', expect.any(Function)],
      [mockButton, 'click', expect.any(Function)],
    ]);
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
