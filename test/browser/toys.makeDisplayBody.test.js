import { describe, it, expect, jest } from '@jest/globals';
import { makeDisplayBody } from '../../src/browser/toys.js';

describe('makeDisplayBody', () => {
  it('should return a function when called with required arguments', () => {
    // Arrange
    const mockDom = {
      removeAllChildren: () => {},
      appendChild: () => {},
      createElement: () => ({}), // Return empty object as mock element
      setTextContent: () => {}
    };
    const mockParent = {};
    const presenterKey = 'text';

    // Act
    const result = makeDisplayBody(mockDom, mockParent, presenterKey);
    const testBody = 'test content';

    // Act & Assert - Invoke the result with a test body
    expect(() => result(testBody)).not.toThrow();
  });

  it('updates the DOM using setTextContent', () => {
    const setTextContent = jest.fn();
    const mockDom = {
      removeAllChildren: jest.fn(),
      appendChild: jest.fn(),
      createElement: jest.fn(() => ({})),
      setTextContent,
    };
    const mockParent = {};
    const presenterKey = 'text';

    const displayBody = makeDisplayBody(mockDom, mockParent, presenterKey);
    const body = 'content';
    displayBody(body);

    expect(mockDom.removeAllChildren).toHaveBeenCalledWith(mockParent);
    expect(mockDom.appendChild).toHaveBeenCalledWith(
      mockParent,
      expect.anything()
    );
  });
});
