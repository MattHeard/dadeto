import { describe, it, expect } from '@jest/globals';
import { isValidParsedRequest } from '../../src/browser/toys.js';

describe('isValidParsedRequest additional case', () => {
  it('returns false for function input', () => {
    const fn = () => {};
    expect(isValidParsedRequest(fn)).toBe(false);
  });
});
