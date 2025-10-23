import { describe, test, expect, jest } from '@jest/globals';
import { ensureNumberInput } from '../../src/core/inputHandlers/number.js';

describe('ensureNumberInput', () => {
  test('should return existing number input without creating a new one', () => {
    // Arrange
    const mockNumberInput = { type: 'number' };
    const mockDom = {
      querySelector: jest.fn(() => mockNumberInput),
      getTargetValue: jest.fn(),
      setValue: jest.fn(),
    };
    const mockContainer = {};

    // Act
    const result = ensureNumberInput(mockContainer, { value: '42' }, mockDom);

    // Assert
    expect(mockDom.querySelector).toHaveBeenCalledWith(
      mockContainer,
      'input[type="number"]'
    );
    expect(result).toBe(mockNumberInput);
  });

  test('creates and inserts a number input when one does not exist', () => {
    // Arrange
    const nextSibling = {};
    const createdInput = {};
    const mockContainer = { insertBefore: jest.fn() };
    const mockDom = {
      querySelector: jest.fn(() => null),
      createElement: jest.fn(() => createdInput),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getNextSibling: jest.fn(() => nextSibling),
    };
    const textInput = { value: '42' };

    // Act
    const result = ensureNumberInput(mockContainer, textInput, mockDom);

    // Assert
    expect(mockDom.createElement).toHaveBeenCalledWith('input');
    expect(mockDom.setType).toHaveBeenCalledWith(createdInput, 'number');
    expect(mockDom.getNextSibling).toHaveBeenCalledWith(textInput);
    expect(mockContainer.insertBefore).toHaveBeenCalledWith(
      createdInput,
      nextSibling
    );
    expect(result).toBe(createdInput);
  });

  test('attaches an input listener that updates the text input', () => {
    const nextSibling = {};
    const createdInput = {};
    const mockContainer = { insertBefore: jest.fn() };
    const mockDom = {
      querySelector: jest.fn(() => null),
      createElement: jest.fn(() => createdInput),
      setType: jest.fn(),
      setValue: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getNextSibling: jest.fn(() => nextSibling),
      getTargetValue: jest.fn(() => '123'),
    };
    const textInput = { value: '0' };

    ensureNumberInput(mockContainer, textInput, mockDom);

    expect(mockDom.addEventListener).toHaveBeenCalledWith(
      createdInput,
      'input',
      expect.any(Function)
    );

    const handler = mockDom.addEventListener.mock.calls[0][2];
    const event = {};
    handler(event);

    expect(mockDom.getTargetValue).toHaveBeenCalledWith(event);
    expect(mockDom.setValue).toHaveBeenCalledWith(textInput, '123');
  });
});
