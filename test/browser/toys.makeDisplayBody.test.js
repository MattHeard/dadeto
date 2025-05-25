import { describe, it, expect } from '@jest/globals';
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
});
