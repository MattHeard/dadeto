import { isValidParsedRequest } from '../../src/browser/toys.js';

describe('isValidParsedRequest', () => {
  it('returns true for a valid parsed request with string URL', () => {
    const validRequest = {
      request: {
        url: 'https://example.com',
      },
    };
    expect(isValidParsedRequest(validRequest)).toBe(true);
  });

  it('returns false for non-object input', () => {
    expect(isValidParsedRequest(null)).toBe(false);
    expect(isValidParsedRequest(undefined)).toBe(false);
    expect(isValidParsedRequest(42)).toBe(false);
    expect(isValidParsedRequest('string')).toBe(false);
    expect(isValidParsedRequest({})).toBe(false);
  });

  it('returns false for object without request field', () => {
    const invalidRequest = {
      notRequest: {
        url: 'https://example.com',
      },
    };
    expect(isValidParsedRequest(invalidRequest)).toBe(false);
  });

  it('returns false for request without url field', () => {
    const invalidRequest = {
      request: {
        notUrl: 'https://example.com',
      },
    };
    expect(isValidParsedRequest(invalidRequest)).toBe(false);
  });

  it('returns false for request with non-string url', () => {
    const invalidRequest = {
      request: {
        url: 12345,
      },
    };
    expect(isValidParsedRequest(invalidRequest)).toBe(false);
  });

  it('returns false for arrays and boolean values', () => {
    expect(isValidParsedRequest([])).toBe(false);
    expect(isValidParsedRequest(true)).toBe(false);
    expect(isValidParsedRequest(false)).toBe(false);
  });
});
