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
      addClass: jest.fn(),
      hide: jest.fn(),
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
      .mockReturnValue({}); // Any other calls (select, options, toggle btn, button)

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

    // 6 row appends (key, value, toggle, select, button, container) + 4 option appends = 10
    expect(mockDom.appendChild).toHaveBeenCalledTimes(10);
  });

  it('creates a button element with the correct tag', () => {
    mockDom.createElement
      .mockReturnValueOnce({}) // row div
      .mockReturnValueOnce({}) // key input
      .mockReturnValueOnce({}) // value input
      .mockReturnValueOnce({}) // select
      .mockReturnValueOnce({}) // option 1
      .mockReturnValueOnce({}) // option 2
      .mockReturnValueOnce({}) // option 3
      .mockReturnValueOnce({}) // option 4
      .mockReturnValueOnce({}) // toggle button
      .mockReturnValueOnce({}); // button element

    rowCreator(mockEntries[0], 0);

    expect(mockDom.createElement.mock.calls[9][0]).toBe('button');
  });

  it('creates a remove button for non-last rows', () => {
    // Setup mock elements
    const mockButton = {};
    mockDom.createElement
      .mockReturnValueOnce({}) // row div
      .mockReturnValueOnce({}) // key input
      .mockReturnValueOnce({}) // value input
      .mockReturnValueOnce({}) // select
      .mockReturnValueOnce({}) // option 1
      .mockReturnValueOnce({}) // option 2
      .mockReturnValueOnce({}) // option 3
      .mockReturnValueOnce({}) // option 4
      .mockReturnValueOnce({}) // toggle button
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
      .mockReturnValueOnce({}) // select
      .mockReturnValueOnce({}) // option 1
      .mockReturnValueOnce({}) // option 2
      .mockReturnValueOnce({}) // option 3
      .mockReturnValueOnce({}) // option 4
      .mockReturnValueOnce({}) // toggle button
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
      .mockReturnValueOnce({}) // select
      .mockReturnValueOnce({}) // option 1
      .mockReturnValueOnce({}) // option 2
      .mockReturnValueOnce({}) // option 3
      .mockReturnValueOnce({}) // option 4
      .mockReturnValueOnce({}) // toggle button
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
      .mockReturnValueOnce({}) // select
      .mockReturnValueOnce({}) // option 1
      .mockReturnValueOnce({}) // option 2
      .mockReturnValueOnce({}) // option 3
      .mockReturnValueOnce({}) // option 4
      .mockReturnValueOnce({}) // toggle button
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
      .mockReturnValueOnce({}) // select
      .mockReturnValueOnce({}) // option 1
      .mockReturnValueOnce({}) // option 2
      .mockReturnValueOnce({}) // option 3
      .mockReturnValueOnce({}) // option 4
      .mockReturnValueOnce({}) // toggle button
      .mockReturnValue(mockButton);

    rowCreator(mockEntries[0], 0);

    expect(mockDom.createElement).toHaveBeenNthCalledWith(10, 'button');
    expect(mockDom.setType).toHaveBeenCalledWith(mockButton, 'button');
  });

  it('adds event listeners for key, value, type select, toggle, and button', () => {
    // Setup mock elements
    const mockKeyInput = {};
    const mockValueInput = {};
    const mockTypeSelect = {};
    const mockToggleBtn = {};
    const mockButton = {};

    mockDom.createElement
      .mockReturnValueOnce({}) // row div
      .mockReturnValueOnce(mockKeyInput) // key input
      .mockReturnValueOnce(mockValueInput) // value input
      .mockReturnValueOnce(mockTypeSelect) // type select
      .mockReturnValueOnce({}) // option 1
      .mockReturnValueOnce({}) // option 2
      .mockReturnValueOnce({}) // option 3
      .mockReturnValueOnce({}) // option 4
      .mockReturnValueOnce(mockToggleBtn) // toggle button
      .mockReturnValue(mockButton); // +/× button

    // Call the row creator function
    rowCreator(['key1', 'value1'], 0);

    // Verify event listeners were added
    expect(mockDom.addEventListener.mock.calls).toEqual([
      [mockKeyInput, 'input', expect.any(Function)],
      [mockValueInput, 'input', expect.any(Function)],
      [mockTypeSelect, 'change', expect.any(Function)],
      [mockToggleBtn, 'click', expect.any(Function)],
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
    const typeSelect = {};
    const toggleBtn = {};
    const btnEl = {};
    mockDom.createElement
      .mockReturnValueOnce(rowEl)
      .mockReturnValueOnce(keyInput)
      .mockReturnValueOnce(valueInput)
      .mockReturnValueOnce(typeSelect) // select
      .mockReturnValueOnce({}) // option 1
      .mockReturnValueOnce({}) // option 2
      .mockReturnValueOnce({}) // option 3
      .mockReturnValueOnce({}) // option 4
      .mockReturnValueOnce(toggleBtn)
      .mockReturnValueOnce(btnEl);

    rowCreator(mockEntries[0], 0);

    const [
      [addedKeyEl, , keyHandler],
      [addedValueEl, , valueHandler],
      [addedTypeSelect, , typeChangeHandler],
      [addedToggleBtn, , toggleHandler],
      [addedBtnEl, , btnHandler],
    ] = mockDom.addEventListener.mock.calls;

    const [keyDisposer, valueDisposer, typeDisposer, toggleDisposer, btnDisposer] =
      mockDisposers;

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
    typeDisposer();
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      addedTypeSelect,
      'change',
      typeChangeHandler
    );

    mockDom.removeEventListener.mockClear();
    toggleDisposer();
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      addedToggleBtn,
      'click',
      toggleHandler
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
      .mockReturnValueOnce({}) // row div 1
      .mockReturnValueOnce({}) // key input 1
      .mockReturnValueOnce({}) // value input 1
      .mockReturnValueOnce({}) // select 1
      .mockReturnValueOnce({}) // option 1a
      .mockReturnValueOnce({}) // option 1b
      .mockReturnValueOnce({}) // option 1c
      .mockReturnValueOnce({}) // option 1d
      .mockReturnValueOnce({}) // toggle btn 1
      .mockReturnValueOnce(btn0) // button 1
      .mockReturnValueOnce({}) // row div 2
      .mockReturnValueOnce({}) // key input 2
      .mockReturnValueOnce({}) // value input 2
      .mockReturnValueOnce({}) // select 2
      .mockReturnValueOnce({}) // option 2a
      .mockReturnValueOnce({}) // option 2b
      .mockReturnValueOnce({}) // option 2c
      .mockReturnValueOnce({}) // option 2d
      .mockReturnValueOnce({}) // toggle btn 2
      .mockReturnValueOnce(btn1); // button 2

    rowCreator(mockEntries[0], 0);
    rowCreator(mockEntries[1], 1);

    // setTextContent calls per row: 4 options + 1 toggle btn + 1 +/× btn = 6 per row
    // btn0 is 6th call (index 5), btn1 is 12th call (index 11)
    expect(mockDom.setTextContent).toHaveBeenNthCalledWith(6, btn0, '×');
    expect(mockDom.setTextContent).toHaveBeenNthCalledWith(12, btn1, '+');
  });
});
