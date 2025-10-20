import { describe, it, expect, jest } from '@jest/globals';
import { setLocalPermanentData } from '../../src/core/browser/data.js';

describe('setLocalPermanentData', () => {
  it('merges with stored data and persists', () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn() };
    storage.getItem.mockReturnValueOnce(JSON.stringify({ existing: true }));
    const logError = jest.fn();
    const incoming = { foo: 'bar' };
    const result = setLocalPermanentData(incoming, { logError }, storage);
    expect(result).toEqual({ existing: true, foo: 'bar' });
    expect(storage.setItem).toHaveBeenCalledWith(
      'permanentData',
      JSON.stringify({ existing: true, foo: 'bar' })
    );
  });

  it('throws and logs when state is invalid', () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn() };
    const logError = jest.fn();
    expect(() => setLocalPermanentData(null, { logError }, storage)).toThrow(
      'setLocalPermanentData requires an object.'
    );
    expect(logError).toHaveBeenCalledWith(
      'setLocalPermanentData received invalid data structure:',
      null
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('handles missing storage without attempting to persist data', () => {
    const logError = jest.fn();
    const incoming = { foo: 'bar' };

    expect(setLocalPermanentData(incoming, { logError })).toEqual({ foo: 'bar' });
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs read errors and falls back to an empty object', () => {
    const storage = {
      getItem: jest.fn().mockReturnValue('not-json'),
      setItem: jest.fn(),
    };
    const logError = jest.fn();

    const result = setLocalPermanentData(
      { foo: 'bar' },
      { logError },
      storage
    );

    expect(logError).toHaveBeenCalledWith(
      'Failed to read permanent data:',
      expect.any(SyntaxError)
    );
    expect(result).toEqual({ foo: 'bar' });
  });

  it('logs write errors when persistence fails', () => {
    const error = new Error('storage-failure');
    const storage = {
      getItem: jest.fn().mockReturnValue('{}'),
      setItem: jest.fn(() => {
        throw error;
      }),
    };
    const logError = jest.fn();

    const result = setLocalPermanentData(
      { foo: 'bar' },
      { logError },
      storage
    );

    expect(result).toEqual({ foo: 'bar' });
    expect(logError).toHaveBeenCalledWith(
      'Failed to persist permanent data:',
      error
    );
  });

  it('treats empty storage values as an empty object', () => {
    const storage = {
      getItem: jest.fn().mockReturnValue(''),
      setItem: jest.fn(),
    };
    const logError = jest.fn();

    const result = setLocalPermanentData(
      { foo: 'bar' },
      { logError },
      storage
    );

    expect(result).toEqual({ foo: 'bar' });
    expect(storage.setItem).toHaveBeenCalledWith(
      'permanentData',
      JSON.stringify({ foo: 'bar' })
    );
    expect(logError).not.toHaveBeenCalled();
  });
});
