import { describe, test, expect, jest } from '@jest/globals';
import { ensureNumberInput } from '../../src/browser/toys.js';

describe('ensureNumberInput', () => {
  test('should return existing number input without creating a new one', () => {
    // Arrange
    const mockNumberInput = { type: 'number' };
    const mockDom = {
      querySelector: jest.fn(() => mockNumberInput),
      getTargetValue: jest.fn(),
      setValue: jest.fn()
    };
    const mockContainer = {};

    // Act
    const result = ensureNumberInput(mockContainer, { value: '42' }, mockDom);

    // Assert
    expect(result).toBe(mockNumberInput);
  });
});
