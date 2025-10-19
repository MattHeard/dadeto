import { describe, it, expect, jest } from '@jest/globals';

/**
 * Dynamically import getData so mutation testing covers module initialization.
 */

describe('getData dynamic import', () => {
  it('omits internal state fields', async () => {
    const { getData } = await import('../../src/core/browser/data.js');
    const state = {
      blogStatus: 'loaded',
      blogError: new Error('e'),
      blogFetchPromise: Promise.resolve(),
      blog: { title: 't' },
    };
    const fetchFn = jest.fn();
    const loggers = {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    };
    const result = getData(state, fetchFn, loggers);
    expect(result).toEqual({ blog: { title: 't' } });
    expect(result).not.toHaveProperty('blogStatus');
    expect(result).not.toHaveProperty('blogError');
    expect(result).not.toHaveProperty('blogFetchPromise');
  });
});
