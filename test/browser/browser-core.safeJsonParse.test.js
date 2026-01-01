import { describe, it, expect, jest } from '@jest/globals';
import { safeJsonParse } from '../../src/core/browser/browser-core.js';

describe('safeJsonParse', () => {
  it('returns a message for non-Error parse failures', () => {
    const originalParse = JSON.parse;
    JSON.parse = jest.fn(() => {
      throw 'bad';
    });

    const result = safeJsonParse('{"broken":');

    expect(result).toEqual({
      ok: false,
      message: 'Error: Invalid JSON input. Unknown error',
    });

    JSON.parse = originalParse;
  });
});
