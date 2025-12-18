import { describe, expect, it, jest } from '@jest/globals';
import { textAppendList } from '../../../src/core/browser/toys/2025-11-01/textAppendList.js';

/**
 * Helper that tracks storage mutations through a mock function.
 * @param {Record<string,string>} [initial] Initial key/value pairs to seed the store.
 * @returns {{store: object, fn: jest.Mock}} Storage snapshot and setter mock.
 */
function createStorageMock(initial = {}) {
  const store = { ...initial };
  return {
    store,
    fn: jest.fn(payload => {
      if (!payload || Object.keys(payload).length === 0) {
        return { ...store };
      }
      Object.assign(store, payload);
      return { ...store };
    }),
  };
}

describe('textAppendList', () => {
  it('appends the input to an empty list and persists the result', () => {
    const { store, fn } = createStorageMock();
    const env = new Map([['setLocalPermanentData', fn]]);

    const result = textAppendList('Goblin', env);

    expect(result).toBe('Goblin\n');
    expect(store.LIST1).toBe('Goblin\n');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(2, { LIST1: 'Goblin\n' });
  });

  it('appends to an existing list and returns the updated content', () => {
    const existing = 'Goblin\n';
    const { store, fn } = createStorageMock({ LIST1: existing });
    const env = new Map([['setLocalPermanentData', fn]]);

    const result = textAppendList('Orc', env);

    expect(result).toBe('Goblin\nOrc\n');
    expect(store.LIST1).toBe('Goblin\nOrc\n');
  });

  it('returns a newline when storage helpers are unavailable', () => {
    const env = new Map();

    const result = textAppendList('Elf', env);

    expect(result).toBe('Elf\n');
  });

  it('normalizes non-string inputs using the fallback helper', () => {
    const env = new Map();
    const result = textAppendList(123, env);
    expect(result).toBe('123\n');
  });
});
