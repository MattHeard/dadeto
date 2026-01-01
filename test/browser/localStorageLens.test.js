import { describe, it, expect, jest } from '@jest/globals';
import { createLocalStorageLens } from '../../src/core/browser/localStorageLens.js';

describe('createLocalStorageLens', () => {
  it('returns null when storage is missing', () => {
    const logError = jest.fn();
    const lens = createLocalStorageLens({ storage: null, logError });

    expect(lens.get('missing')).toBeNull();
    expect(() => lens.set('missing', 'value')).not.toThrow();
    expect(logError).not.toHaveBeenCalled();
  });

  it('defaults the error logger when none is provided', () => {
    const storage = {
      getItem: jest.fn(() => {
        throw new Error('fail');
      }),
    };
    const lens = createLocalStorageLens({ storage });

    expect(lens.get('value')).toBeNull();
    expect(storage.getItem).toHaveBeenCalledWith('value');
  });

  it('logs and returns null when storage getItem throws', () => {
    const logError = jest.fn();
    const error = new Error('boom');
    const storage = {
      getItem: jest.fn(() => {
        throw error;
      }),
    };
    const lens = createLocalStorageLens({ storage, logError });

    expect(lens.get('bad')).toBeNull();
    expect(logError).toHaveBeenCalledWith(
      'Failed to read from localStorage key "bad":',
      error
    );
  });

  it('removes items when setting a null value', () => {
    const logError = jest.fn();
    const storage = {
      removeItem: jest.fn(),
      setItem: jest.fn(),
      getItem: jest.fn(),
    };
    const lens = createLocalStorageLens({ storage, logError });

    lens.set('key', null);

    expect(storage.removeItem).toHaveBeenCalledWith('key');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it('returns null for empty stored values', () => {
    const logError = jest.fn();
    const storage = { getItem: jest.fn(() => '') };
    const lens = createLocalStorageLens({ storage, logError });

    expect(lens.get('empty')).toBeNull();
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs and removes when JSON serialization fails', () => {
    const logError = jest.fn();
    const storage = {
      removeItem: jest.fn(),
      setItem: jest.fn(),
      getItem: jest.fn(),
    };
    const lens = createLocalStorageLens({ storage, logError });

    lens.set('value', 1n);

    expect(logError).toHaveBeenCalledWith(
      'Failed to serialize JSON for storage:',
      expect.any(TypeError)
    );
    expect(storage.removeItem).toHaveBeenCalledWith('value');
  });
});
