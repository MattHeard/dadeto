import { describe, it, expect, jest } from '@jest/globals';
import { handleParsedResult } from '../../src/browser/toys.js';

describe('handleParsedResult invalid types', () => {
  it('returns false and does not fetch when parsed is not an object', () => {
    const env = {
      fetchFn: jest.fn(),
      dom: {},
      errorFn: jest.fn(),
    };
    const options = { parent: {}, presenterKey: 'text' };
    const result1 = handleParsedResult(null, env, options);
    const result2 = handleParsedResult('string', env, options);
    const result3 = handleParsedResult(42, env, options);

    expect(result1).toBe(false);
    expect(result2).toBe(false);
    expect(result3).toBe(false);
    expect(env.fetchFn).not.toHaveBeenCalled();
  });
});
