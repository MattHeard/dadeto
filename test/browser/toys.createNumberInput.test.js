/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { createNumberInput } from '../../src/browser/toys.js';

describe('createNumberInput', () => {
  let mockDom;
  let mockOnChange;

  beforeEach(() => {
    // Create a mock input element
    const mockInput = document.createElement('input');

    // Create a mock DOM utilities object
    mockDom = {
      createElement: jest.fn().mockReturnValue(mockInput),
      setType: jest.fn((element, type) => {
        element.type = type;
      }),
      setValue: jest.fn((element, value) => {
        element.value = value;
      }),
      addEventListener: jest.fn((element, event, handler) => {
        element.addEventListener(event, handler);
      }),
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
    expect(mockDom.setType).toHaveBeenCalledWith(expect.any(HTMLInputElement), 'number');
    expect(result).toBeInstanceOf(HTMLInputElement);
    expect(result.type).toBe('number');
  });

  it('sets the initial value when provided', () => {
    // Act
    createNumberInput('42', mockOnChange, mockDom);

    // Assert
    expect(mockDom.setValue).toHaveBeenCalledWith(expect.any(HTMLInputElement), '42');
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
      expect.any(HTMLInputElement),
      'input',
      expect.any(Function)
    );
  });

  it('calls the onChange handler when the input changes', () => {
    // Arrange
    const input = document.createElement('input');
    mockDom.addEventListener.mockImplementation((_, __, handler) => {
      // Simulate an input event
      input.addEventListener('input', handler);
    });

    // Act
    createNumberInput('42', mockOnChange, mockDom);
    input.value = '100';
    input.dispatchEvent(new Event('input'));

    // Assert
    expect(mockOnChange).toHaveBeenCalledWith(expect.any(Event));
  });
});
