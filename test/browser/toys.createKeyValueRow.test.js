import { jest } from '@jest/globals';
import * as toys from '../../src/browser/toys.js';
const { createKeyValueRow } = toys;

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
    rowCreator = createKeyValueRow({
      dom: mockDom,
      entries: mockEntries,
      textInput: mockTextInput,
      rows: mockRows,
      syncHiddenField: mockSyncHiddenField,
      disposers: mockDisposers,
      render: mockRender,
      container: mockContainer,
    });
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
    rowCreator(['key1', 'value1'], 0);

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
      'key1'
    );

    // Verify elements were appended to the row and the row was appended to the container
    expect(mockDom.appendChild).toHaveBeenCalledTimes(4); // row + 3 children + container.appendChild(row)
  });

  it('creates a button element with the correct tag', () => {
    mockDom.createElement
      .mockReturnValueOnce({}) // row div
      .mockReturnValueOnce({}) // key input
      .mockReturnValueOnce({}) // value input
      .mockReturnValueOnce({}); // button element

    rowCreator(mockEntries[0], 0);

    expect(mockDom.createElement.mock.calls[3][0]).toBe('button');
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
    rowCreator(['key1', 'value1'], 0);

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
    rowCreator(['key1', 'value1'], 1);

    // Should set up an add button (+)
    expect(mockDom.setTextContent).toHaveBeenCalledWith(mockButton, '+');
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

  it('creates the button element with the correct type', () => {
    const mockButton = {};
    mockDom.createElement
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValue(mockButton);

    rowCreator(mockEntries[0], 0);

    expect(mockDom.createElement).toHaveBeenNthCalledWith(4, 'button');
    expect(mockDom.setType).toHaveBeenCalledWith(mockButton, 'button');
  });

  it('adds event listeners for key and value changes', () => {
    // Setup mock elements
    const mockKeyInput = {};
    const mockValueInput = {};
    const mockButton = {};

    mockDom.createElement
      .mockReturnValueOnce({}) // row div
      .mockReturnValueOnce(mockKeyInput) // key input
      .mockReturnValueOnce(mockValueInput) // value input
      .mockReturnValue(mockButton); // button

    // Call the row creator function
    rowCreator(['key1', 'value1'], 0);

    // Verify event listeners were added
    expect(mockDom.addEventListener.mock.calls).toEqual([
      [mockKeyInput, 'input', expect.any(Function)],
      [mockValueInput, 'input', expect.any(Function)],
      [mockButton, 'click', expect.any(Function)],
    ]);
  });

  it('key disposer removes the key input listener', () => {
    const keyInput = {};
    mockDom.createElement
      .mockReturnValueOnce({})
      .mockReturnValueOnce(keyInput)
      .mockReturnValueOnce({})
      .mockReturnValue({});

    rowCreator(mockEntries[0], 0);

    const handler = mockDom.addEventListener.mock.calls[0][2];
    const [keyDisposer] = mockDisposers;

    mockDom.removeEventListener.mockClear();
    keyDisposer();

    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      keyInput,
      'input',
      handler
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
    const rowEl = {};
    const keyInput = {};
    const valueInput = {};
    const btnEl = {};
    mockDom.createElement
      .mockReturnValueOnce(rowEl)
      .mockReturnValueOnce(keyInput)
      .mockReturnValueOnce(valueInput)
      .mockReturnValueOnce(btnEl);

    rowCreator(mockEntries[0], 0);

    const [
      [addedKeyEl, , keyHandler],
      [addedValueEl, , valueHandler],
      [addedBtnEl, , btnHandler],
    ] = mockDom.addEventListener.mock.calls;

    const [keyDisposer, valueDisposer, btnDisposer] = mockDisposers;

    mockDom.removeEventListener.mockClear();
    keyDisposer();
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      addedKeyEl,
      'input',
      keyHandler
    );

    mockDom.removeEventListener.mockClear();
    valueDisposer();
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      addedValueEl,
      'input',
      valueHandler
    );

    mockDom.removeEventListener.mockClear();
    btnDisposer();
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      addedBtnEl,
      'click',
      btnHandler
    );
  });

  it('creates different button types for each index', () => {
    const btn0 = {};
    const btn1 = {};

    mockDom.createElement
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce(btn0)
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce({})
      .mockReturnValueOnce(btn1);

    rowCreator(mockEntries[0], 0);
    rowCreator(mockEntries[1], 1);

    expect(mockDom.setTextContent).toHaveBeenNthCalledWith(1, btn0, '×');
    expect(mockDom.setTextContent).toHaveBeenNthCalledWith(2, btn1, '+');
  });
});
