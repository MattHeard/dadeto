import { jest } from '@jest/globals';
import { createNumberInput } from '../../src/inputHandlers/number.js';

describe('createNumberInput', () => {
  let mockDom;
  let mockOnChange;
  let mockInput;

  beforeEach(() => {
    // Create a mock input element
    mockInput = {};

    // Create a mock DOM utilities object
    mockDom = {
      createElement: jest.fn().mockReturnValue(mockInput),
      setType: jest.fn((element, type) => {
        element.type = type;
      }),
      setValue: jest.fn((element, value) => {
        element.value = value;
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    // Mock the onChange handler
    mockOnChange = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a number input element with the correct type', () => {
    // Act
    const result = createNumberInput('42', mockOnChange, mockDom);

    // Assert
    expect(mockDom.createElement).toHaveBeenCalledWith('input');
    expect(mockDom.setType).toHaveBeenCalledWith(expect.any(Object), 'number');
    expect(result).toBeInstanceOf(Object);
    expect(result.type).toBe('number');
  });

  it('sets the initial value when provided', () => {
    // Act
    createNumberInput('42', mockOnChange, mockDom);

    // Assert
    expect(mockDom.setValue).toHaveBeenCalledWith(expect.any(Object), '42');
  });

  it('does not set a value when none is provided', () => {
    // Act
    createNumberInput(undefined, mockOnChange, mockDom);

    // Assert
    expect(mockDom.setValue).not.toHaveBeenCalled();
  });

  it('sets up input event listeners', () => {
    // Act
    createNumberInput('42', mockOnChange, mockDom);

    // Assert
    expect(mockDom.addEventListener).toHaveBeenCalledWith(
      expect.any(Object),
      'input',
      expect.any(Function)
    );
  });

  it('calls the onChange handler when the input changes', () => {
    // Arrange
    let inputHandler;
    mockDom.addEventListener.mockImplementation((_, event, handler) => {
      if (event === 'input') {
        inputHandler = handler;
      }
    });

    // Act
    createNumberInput('42', mockOnChange, mockDom);
    const mockEvent = { target: { value: '100' } };
    inputHandler(mockEvent);

    // Assert
    expect(mockOnChange).toHaveBeenCalledWith(mockEvent);
  });

  it('provides a disposer that removes the input listener', () => {
    createNumberInput('1', mockOnChange, mockDom);

    const [[inputEl, , handler]] = mockDom.addEventListener.mock.calls;
    expect(typeof inputEl._dispose).toBe('function');

    inputEl._dispose();

    expect(mockDom.removeEventListener).toHaveBeenCalledWith(
      inputEl,
      'input',
      handler
    );
  });
});
