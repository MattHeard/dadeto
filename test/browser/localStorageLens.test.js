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

  it('writes non-null JSON values and logs storage write failures', () => {
    const logError = jest.fn();
    const storage = {
      getItem: jest.fn(),
      setItem: jest.fn(() => {
        throw new Error('write failed');
      }),
      removeItem: jest.fn(),
    };
    const lens = createLocalStorageLens({ storage, logError });

    lens.set('key', { value: 1 });

    expect(storage.setItem).toHaveBeenCalledWith('key', '{"value":1}');
    expect(logError).toHaveBeenCalledWith(
      'Failed to persist permanent data:',
      expect.any(Error)
    );
  });

  it('returns null for empty stored values', () => {
    const logError = jest.fn();
    const storage = { getItem: jest.fn(() => '') };
    const lens = createLocalStorageLens({ storage, logError });

    expect(lens.get('empty')).toBeNull();
    expect(logError).not.toHaveBeenCalled();
  });

  it('deserializes valid stored JSON', () => {
    const storage = { getItem: jest.fn(() => '{"value":1}') };
    const lens = createLocalStorageLens({ storage });

    expect(lens.get('value')).toEqual({ value: 1 });
  });

  it('logs and returns null for invalid stored JSON', () => {
    const logError = jest.fn();
    const storage = { getItem: jest.fn(() => '{invalid') };
    const lens = createLocalStorageLens({ storage, logError });

    expect(lens.get('invalid')).toBeNull();
    expect(logError).toHaveBeenCalledWith(
      'Failed to read permanent data:',
      expect.any(SyntaxError)
    );
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

  it('removes storage entries for undefined values', () => {
    const storage = {
      removeItem: jest.fn(),
      setItem: jest.fn(),
      getItem: jest.fn(),
    };
    const lens = createLocalStorageLens({ storage });

    lens.set('missing', undefined);

    expect(storage.removeItem).toHaveBeenCalledWith('missing');
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
