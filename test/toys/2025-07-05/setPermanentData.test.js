import { setPermanentData } from '../../../src/core/browser/toys/2025-07-05/setPermanentData.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('setPermanentData', () => {
  test('passes parsed object to env and returns the result', () => {
    const mock = jest.fn(obj => ({ ...obj, ok: true }));
    const env = new Map([['setLocalPermanentData', mock]]);
    const input = JSON.stringify({ foo: 'bar' });
    const result = JSON.parse(setPermanentData(input, env));
    expect(result).toEqual({ foo: 'bar', ok: true });
    expect(mock).toHaveBeenCalledWith({ foo: 'bar' });
  });

  test('returns empty object on parse failure', () => {
    const mock = jest.fn();
    const env = new Map([['setLocalPermanentData', mock]]);
    const output = setPermanentData('not json', env);
    expect(output).toBe(JSON.stringify({}));
    expect(mock).not.toHaveBeenCalled();
  });

  test('returns empty object when the storage helper is not available', () => {
    const env = new Map();
    const output = setPermanentData('{"foo": "bar"}', env);
    expect(output).toBe(JSON.stringify({}));
  });
});
