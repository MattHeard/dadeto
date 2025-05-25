import { describe, it, expect } from '@jest/globals';
import { makeDisplayBody } from '../../src/browser/toys.js';

describe('makeDisplayBody', () => {
  it('should return a function when called with required arguments', () => {
    // Arrange
    const mockDom = {};
    const mockParent = {};
    const presenterKey = 'text';

    // Act
    const result = makeDisplayBody(mockDom, mockParent, presenterKey);

    // Assert
    expect(typeof result).toBe('function');
  });
});
