import { describe, it, expect } from '@jest/globals';
import { isValidParsedRequest } from '../../src/browser/toys.js';

describe('isValidParsedRequest additional scenarios', () => {
  it('returns false for object with numeric url', () => {
    const parsed = { request: { url: 123 } };
    expect(isValidParsedRequest(parsed)).toBe(false);
  });

  it('returns false when request field missing url property', () => {
    const parsed = { request: { notUrl: 'x' } };
    expect(isValidParsedRequest(parsed)).toBe(false);
  });
});
