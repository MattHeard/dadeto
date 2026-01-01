import { describe, it, expect } from '@jest/globals';
import { createMemoryStorageLens } from '../../src/core/browser/memoryStorageLens.js';

describe('createMemoryStorageLens', () => {
  it('stores values in the default backing map', () => {
    const lens = createMemoryStorageLens();

    lens.set('alpha', 123);

    expect(lens.get('alpha')).toBe(123);
  });

  it('uses the provided backing map', () => {
    const store = new Map([['existing', 'value']]);
    const lens = createMemoryStorageLens(store);

    expect(lens.get('existing')).toBe('value');
    lens.set('next', 'item');

    expect(store.get('next')).toBe('item');
  });
});
