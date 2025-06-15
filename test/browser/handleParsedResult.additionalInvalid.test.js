import { describe, it, expect, jest } from '@jest/globals';
import { handleParsedResult } from '../../src/browser/toys.js';

describe('handleParsedResult additional invalid cases', () => {
  it('returns false for non-object values without calling fetch', () => {
    const env = { fetchFn: jest.fn(), dom: {}, errorFn: jest.fn() };
    const options = { parent: {}, presenterKey: 'text' };
    expect(handleParsedResult(undefined, env, options)).toBe(false);
    expect(handleParsedResult(123, env, options)).toBe(false);
    expect(env.fetchFn).not.toHaveBeenCalled();
  });
});
