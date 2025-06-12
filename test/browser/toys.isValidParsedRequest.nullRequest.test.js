import { describe, it, expect } from '@jest/globals';
import { isValidParsedRequest } from '../../src/browser/toys.js';

describe('isValidParsedRequest null request field', () => {
  it('returns false when request property is null', () => {
    const parsed = { request: null };
    expect(isValidParsedRequest(parsed)).toBe(false);
  });
});
