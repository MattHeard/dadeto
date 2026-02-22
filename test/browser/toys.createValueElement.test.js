import { jest } from '@jest/globals';
import { createValueElement } from '../../src/browser/toys.js';

describe('createValueElement', () => {
  let mockDom;
  let valueEl;
  let keyEl;
  let textInput;
  let rowData;
  let syncHiddenField;
  let disposers;

  beforeEach(() => {
    // Set up mock DOM utilities
    mockDom = {
      createElement: jest.fn().mockReturnValue({}),
      setType: jest.fn(),
      setPlaceholder: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getTargetValue: jest.fn(event => event.target.value),
      getDataAttribute: jest.fn(() => 'testKey'),
      setDataAttribute: jest.fn(),
    };

    // Set up test data
    keyEl = { value: 'testKey' };
    textInput = {};
    rowData = { rows: {}, rowTypes: {} };
    syncHiddenField = jest.fn();
    disposers = [];
  });

  it('creates a value input element with the correct initial properties', () => {
    const initialValue = 'testValue';

    valueEl = createValueElement({
      dom: mockDom,
      value: initialValue,
      keyEl,
      textInput,
      rowData,
      syncHiddenField,
      disposers,
    });

    // Verify element creation
    expect(mockDom.createElement).toHaveBeenCalledWith('input');

    // Verify element properties
    expect(mockDom.setType).toHaveBeenCalledWith(valueEl, 'text');
    expect(mockDom.setPlaceholder).toHaveBeenCalledWith(valueEl, 'Value');
    expect(mockDom.setValue).toHaveBeenCalledWith(valueEl, initialValue);

    // Verify event listener was added
    expect(mockDom.addEventListener).toHaveBeenCalledWith(
      valueEl,
      'input',
      expect.any(Function)
    );

    // Verify disposer was added
    expect(disposers).toHaveLength(1);
    expect(disposers[0]).toBeInstanceOf(Function);
  });

  it('updates the rows object and syncs when value is changed', () => {
    const initialValue = 'initialValue';
    const newValue = 'newValue';
    const key = 'testKey';

    // Set up initial state
    rowData.rows[key] = initialValue;

    // Create the value element
    valueEl = createValueElement({
      dom: mockDom,
      value: initialValue,
      keyEl,
      textInput,
      rowData,
      syncHiddenField,
      disposers,
    });

    // Get the input event handler
    const inputHandler = mockDom.addEventListener.mock.calls[0][2];

    // Simulate changing the value
    valueEl.value = newValue;
    const mockEvent = { target: valueEl };

    // Call the input handler directly with our mock event
    inputHandler(mockEvent);

    // Verify the rows object was updated
    expect(rowData.rows[key]).toBe(newValue);

    // Verify syncHiddenField was called with the updated rowData
    expect(syncHiddenField).toHaveBeenCalledWith(textInput, rowData, mockDom);
  });

  it('cleans up event listeners when disposer is called', () => {
    valueEl = createValueElement({
      dom: mockDom,
      value: 'testValue',
      keyEl,
      textInput,
      rowData,
      syncHiddenField,
      disposers,
    });

    // Get the disposer function
    const disposer = disposers[0];

    // Call the disposer
    disposer();

    // Verify removeEventListener was called with the correct arguments
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      valueEl,
      'input',
      expect.any(Function)
    );
  });

  it('uses the same handler for add and remove listener', () => {
    valueEl = createValueElement({
      dom: mockDom,
      value: 'testValue',
      keyEl,
      textInput,
      rowData,
      syncHiddenField,
      disposers,
    });

    // Capture the handler passed to addEventListener
    const [el, eventName, handler] = mockDom.addEventListener.mock.calls[0];

    // Call the disposer returned from createValueElement
    const disposer = disposers[0];
    disposer();

    // Ensure removeEventListener was called with the same handler
    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      el,
      eventName,
      handler
    );
  });

  it('cleanup can be called multiple times', () => {
    valueEl = createValueElement({
      dom: mockDom,
      value: 'multi',
      keyEl,
      textInput,
      rowData,
      syncHiddenField,
      disposers,
    });

    const disposer = disposers[0];
    disposer();
    disposer();

    expect(mockDom.removeEventListener).toHaveBeenCalledTimes(2);
  });
});
