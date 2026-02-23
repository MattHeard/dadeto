import { describe, expect, it, jest } from '@jest/globals';
import { textAppendList } from '../../../src/core/browser/toys/2025-11-01/textAppendList.js';

describe('textAppendList additional branches', () => {
  it('handles undefined input', () => {
    const { fn } = createStorageMock();
    const env = new Map([['setLocalPermanentData', fn]]);

    const result = textAppendList(undefined, env);

    expect(result).toBe('\n');
  });

  it('handles null input', () => {
    const { fn } = createStorageMock();
    const env = new Map([['setLocalPermanentData', fn]]);

    const result = textAppendList(null, env);

    expect(result).toBe('\n');
  });

  it('handles number input', () => {
    const { fn } = createStorageMock();
    const env = new Map([['setLocalPermanentData', fn]]);

    const result = textAppendList(123, env);

    expect(result).toBe('123\n');
  });

  it('handles non-function storage function', () => {
    const env = new Map([['setLocalPermanentData', 'not a function']]);

    const result = textAppendList('Dwarf', env);

    expect(result).toBe('Dwarf\n');
  });

  it('handles null env', () => {
    const result = textAppendList('Dwarf', null);

    expect(result).toBe('Dwarf\n');
  });

  it('handles storage function that throws on read', () => {
    const fn = jest.fn(() => {
      throw new Error('read error');
    });
    const env = new Map([['setLocalPermanentData', fn]]);

    const result = textAppendList('Gnome', env);

    expect(result).toBe('Gnome\n');
  });

  it('handles storage function that throws on write', () => {
    const fn = jest
      .fn()
      .mockReturnValueOnce({ LIST1: 'Gnome\n' })
      .mockImplementationOnce(() => {
        throw new Error('write error');
      });
    const env = new Map([['setLocalPermanentData', fn]]);

    const result = textAppendList('Halfling', env);

    expect(result).toBe('Gnome\nHalfling\n');
  });

  it('handles empty string input with storage available', () => {
    const { fn } = createStorageMock();
    const env = new Map([['setLocalPermanentData', fn]]);

    const result = textAppendList('', env);

    expect(result).toBe('\n');
  });
});

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
