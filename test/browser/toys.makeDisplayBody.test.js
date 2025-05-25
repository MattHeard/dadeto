import { describe, it, expect } from '@jest/globals';
import { makeDisplayBody } from '../../src/browser/toys.js';

describe('makeDisplayBody', () => {
  it('should return a function when called with no arguments', () => {
    // Act
    const result = makeDisplayBody();

    // Assert
    expect(typeof result).toBe('function');
  });
});
