import { describe, it, expect, jest } from '@jest/globals';
import {
  createStorageLens,
  focusLens,
  mapLens,
} from '../../src/core/browser/storageLens.js';

describe('createStorageLens', () => {
  it('returns a lens with the provided getter and setter', () => {
    const getter = jest.fn();
    const setter = jest.fn();
    const lens = createStorageLens(getter, setter);

    lens.get('alpha');
    lens.set('beta', 42);

    expect(getter).toHaveBeenCalledWith('alpha');
    expect(setter).toHaveBeenCalledWith('beta', 42);
  });
});

describe('focusLens', () => {
  it('reads and writes using the focused key', () => {
    const parentLens = {
      get: jest.fn(() => 'value'),
      set: jest.fn(),
    };
    const lens = focusLens(parentLens, 'focus-key');

    expect(lens.get()).toBe('value');
    lens.set('updated');

    expect(parentLens.get).toHaveBeenCalledWith('focus-key');
    expect(parentLens.set).toHaveBeenCalledWith('focus-key', 'updated');
  });
});

describe('mapLens', () => {
  it('applies transforms on get and set', () => {
    const baseLens = {
      get: jest.fn(() => 2),
      set: jest.fn(),
    };
    const lens = mapLens(
      baseLens,
      value => value * 3,
      value => value + 1
    );

    expect(lens.get('key')).toBe(6);
    lens.set('key', 4);

    expect(baseLens.get).toHaveBeenCalledWith('key');
    expect(baseLens.set).toHaveBeenCalledWith('key', 5);
  });
});
