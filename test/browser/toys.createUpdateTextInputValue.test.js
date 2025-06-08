import { jest } from '@jest/globals';
import { createUpdateTextInputValue } from '../../src/browser/toys.js';

describe('createUpdateTextInputValue', () => {
  let textInput;
  let mockDom;
  let mockEvent;

  beforeEach(() => {
    // Create a text input element
    textInput = {};
    textInput.type = 'text';

    // Create a mock DOM utilities object
    mockDom = {
      getTargetValue: jest.fn(),
      setValue: jest.fn(),
    };

    // Create a mock event
    mockEvent = {
      target: {},
      preventDefault: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('expects two arguments (textInput and dom)', () => {
    expect(createUpdateTextInputValue.length).toBe(2);
  });

  it('returns a handler function that expects an event parameter', () => {
    const updateHandler = createUpdateTextInputValue(textInput, mockDom);
    expect(typeof updateHandler).toBe('function');
    expect(updateHandler.length).toBe(1);
  });

  it('creates a function that updates the text input value from an event', () => {
    // Arrange
    const testValue = 'test value';
    mockDom.getTargetValue.mockReturnValue(testValue);

    // Act
    const updateHandler = createUpdateTextInputValue(textInput, mockDom);
    updateHandler(mockEvent);

    // Assert
    expect(mockDom.getTargetValue).toHaveBeenCalledWith(mockEvent);
    expect(mockDom.setValue).toHaveBeenCalledWith(textInput, testValue);
  });

  it('handles empty string values correctly', () => {
    // Arrange
    const emptyValue = '';
    mockDom.getTargetValue.mockReturnValue(emptyValue);

    // Act
    const updateHandler = createUpdateTextInputValue(textInput, mockDom);
    updateHandler(mockEvent);

    // Assert
    expect(mockDom.getTargetValue).toHaveBeenCalledWith(mockEvent);
    expect(mockDom.setValue).toHaveBeenCalledWith(textInput, emptyValue);
  });

  it('handles numeric values without converting them to strings', () => {
    // Arrange
    const numericValue = 42;
    mockDom.getTargetValue.mockReturnValue(numericValue);

    // Act
    const updateHandler = createUpdateTextInputValue(textInput, mockDom);
    updateHandler(mockEvent);

    // Assert
    expect(mockDom.getTargetValue).toHaveBeenCalledWith(mockEvent);
    expect(mockDom.setValue).toHaveBeenCalledWith(textInput, numericValue);
  });

  it('handles null or undefined values by passing them through', () => {
    // Test with null
    mockDom.getTargetValue.mockReturnValue(null);
    let updateHandler = createUpdateTextInputValue(textInput, mockDom);
    updateHandler(mockEvent);
    expect(mockDom.setValue).toHaveBeenCalledWith(textInput, null);

    // Reset mocks
    jest.clearAllMocks();

    // Test with undefined
    mockDom.getTargetValue.mockReturnValue(undefined);
    updateHandler = createUpdateTextInputValue(textInput, mockDom);
    updateHandler(mockEvent);
    expect(mockDom.setValue).toHaveBeenCalledWith(textInput, undefined);
  });

  it('can be used as an event handler for input events', () => {
    // Arrange
    const testValue = 'test input';
    const inputElement = {};
    inputElement.type = 'text';
    inputElement.value = testValue;

    // Mock getTargetValue to return the input's value
    mockDom.getTargetValue.mockImplementation(event => event.target.value);

    // Create a custom event with a target property
    const inputEvent = {
      target: inputElement,
      preventDefault: jest.fn(),
    };

    // Act
    const updateHandler = createUpdateTextInputValue(textInput, mockDom);
    updateHandler(inputEvent);

    // Assert
    expect(mockDom.getTargetValue).toHaveBeenCalledWith(inputEvent);
    expect(mockDom.setValue).toHaveBeenCalledWith(textInput, testValue);
  });

  it('returns a new handler instance on each call', () => {
    const handler1 = createUpdateTextInputValue(textInput, mockDom);
    const handler2 = createUpdateTextInputValue(textInput, mockDom);
    expect(handler1).not.toBe(handler2);
  });
});
