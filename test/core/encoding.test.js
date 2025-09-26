import { jest } from '@jest/globals';
import { getEncodeBase64 } from '../../src/core/encoding.js';

describe('getEncodeBase64', () => {
  it('encodes strings with percent-encoded bytes', () => {
    const btoaMock = jest.fn().mockReturnValue('encoded');
    const encodeBase64 = getEncodeBase64(btoaMock, encodeURIComponent);

    const result = encodeBase64('A✓');

    expect(btoaMock).toHaveBeenCalledWith('A\u00e2\u009c\u0093');
    expect(result).toBe('encoded');
  });

  it('passes through plain strings without modification', () => {
    const btoaMock = jest.fn().mockImplementation(str => `wrapped:${str}`);
    const encodeMock = jest.fn().mockImplementation(() => 'plain-value');
    const encodeBase64 = getEncodeBase64(btoaMock, encodeMock);

    const output = encodeBase64('text');

    expect(encodeMock).toHaveBeenCalledWith('text');
    expect(btoaMock).toHaveBeenCalledWith('plain-value');
    expect(output).toBe('wrapped:plain-value');
  });
});
