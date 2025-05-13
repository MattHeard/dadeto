import { encodeBase64 } from '../../../src/toys/2025-05-13/base64Encoder.js';
import { jest } from '@jest/globals';

describe('encodeBase64', () => {
  it('encodes a string to Base64 using the provided environment function', () => {
    const encoder = jest.fn((input) => {
      if (input === 'test') {
        return 'dGVzdA==';
      } else {
        return 'unexpected input';
      }
    });
    const env = { encodeBase64: encoder };
    expect(encodeBase64('test', env)).toBe('dGVzdA==');
  });
});
