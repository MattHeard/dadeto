import { describe, it, expect } from '@jest/globals';

describe('isValidParsedRequest dynamic import', () => {
  it('validates parsed requests using predicates', async () => {
    const { isValidParsedRequest } = await import('../../src/browser/toys.js');
    const valid = { request: { url: 'https://example.com' } };
    const invalid = { request: { url: 123 } };

    expect(isValidParsedRequest(valid)).toBe(true);
    expect(isValidParsedRequest(invalid)).toBe(false);
  });
});
