import { describe, it, expect, jest } from '@jest/globals';
import { createDropdownInitializer } from '../../src/browser/toys.js';

describe('createDropdownInitializer', () => {
  it('should handle empty NodeList when querySelectorAll returns no elements', () => {
    // Arrange
    const mockOnOutputChange = jest.fn();
    const mockOnInputChange = jest.fn();

    // Mock DOM utilities
    const dom = {
      querySelectorAll: jest.fn(() => []),
    };

    // Act
    const initializeDropdowns = createDropdownInitializer(
      mockOnOutputChange,
      mockOnInputChange,
      dom
    );

    // Assert that the function can be called without errors
    expect(() => initializeDropdowns()).not.toThrow();

    // Verify querySelectorAll was called with the correct selectors
    expect(dom.querySelectorAll).toHaveBeenCalledTimes(2);
    expect(dom.querySelectorAll).toHaveBeenCalledWith(
      'article.entry .value > select.output'
    );
    expect(dom.querySelectorAll).toHaveBeenCalledWith(
      'article.entry .value > select.input'
    );

    // Verify no event listeners were added since the NodeList is empty
    expect(mockOnOutputChange).not.toHaveBeenCalled();
    expect(mockOnInputChange).not.toHaveBeenCalled();
  });
});
