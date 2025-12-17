import { encodeBase64 } from '../../../src/core/browser/toys/2025-05-13/base64Encoder.js';
import { jest } from '@jest/globals';

describe('encodeBase64', () => {
  it('encodes a string to Base64 using the provided environment function', () => {
    const encoder = jest.fn(input => {
      if (input === 'test') {
        return 'dGVzdA==';
      } else {
        return 'unexpected input';
      }
    });
    const get = jest.fn(key => {
      if (key === 'encodeBase64') {
        return encoder;
      } else {
        return undefined;
      }
    });
    const env = { get };
    expect(encodeBase64('test', env)).toBe('dGVzdA==');
  });

  it('throws when the encoding helper is missing', () => {
    const env = { get: () => undefined };
    expect(() => encodeBase64('test', env)).toThrow(
      'encodeBase64 helper is missing'
    );
  });
});
