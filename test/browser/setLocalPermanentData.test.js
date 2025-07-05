import { describe, it, expect, jest } from '@jest/globals';
import { setLocalPermanentData } from '../../src/browser/data.js';

describe('setLocalPermanentData', () => {
  it('merges with stored data and persists', () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn() };
    storage.getItem.mockReturnValueOnce(JSON.stringify({ existing: true }));
    const logError = jest.fn();
    const incoming = { permanent: { foo: 'bar' } };
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
    expect(() => setLocalPermanentData({}, { logError }, storage)).toThrow(
      "setLocalPermanentData requires an object with at least a 'permanent' property."
    );
    expect(logError).toHaveBeenCalledWith(
      'setLocalPermanentData received invalid data structure:',
      {}
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
