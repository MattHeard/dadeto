import { describe, expect, jest } from '@jest/globals';
import { clearDisposers } from '../../src/browser/toys.js';

describe('clearDisposers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls all functions in the disposers array', () => {
    // Arrange
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();
    const disposers = [mockFn1, mockFn2];

    // Act
    clearDisposers(disposers);

    // Assert
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });

  test('clears the disposers array after calling all functions', () => {
    // Arrange
    const disposers = [jest.fn(), jest.fn()];
    const originalLength = disposers.length;

    // Act
    clearDisposers(disposers);

    // Assert
    expect(disposers).toHaveLength(0);
    expect(disposers.length).toBeLessThan(originalLength);
  });

  test('handles an empty array without throwing', () => {
    // Arrange
    const disposers = [];

    // Act & Assert
    expect(() => clearDisposers(disposers)).not.toThrow();
    expect(disposers).toHaveLength(0);
  });

  test('calls functions in the order they appear in the array', () => {
    // Arrange
    const callOrder = [];
    const mockFn1 = jest.fn(() => callOrder.push('fn1'));
    const mockFn2 = jest.fn(() => callOrder.push('fn2'));
    const disposers = [mockFn1, mockFn2];

    // Act
    clearDisposers(disposers);

    // Assert
    expect(callOrder).toEqual(['fn1', 'fn2']);
  });
});
