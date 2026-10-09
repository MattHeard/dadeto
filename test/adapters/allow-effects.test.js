import { jest } from '@jest/globals';
import { requireAllowEffects } from '../../src/adapters/allow-effects.js';

const permission = Object.freeze({});

test('does not invoke the raw callable until explicitly called', () => {
  const callable = jest.fn(() => 'done');
  const adapted = requireAllowEffects(callable);

  expect(callable).not.toHaveBeenCalled();
  expect(adapted(permission)).toBe('done');
  expect(adapted(permission)).toBe('done');
  expect(callable).toHaveBeenCalledTimes(2);
});

test('forwards optional and rest arguments in order and returns the raw value', () => {
  const result = { complete: true };
  const callable = jest.fn((first, optional, ...rest) => ({
    args: [first, optional, ...rest],
    result,
  }));
  const adapted = requireAllowEffects(callable);

  const actual = adapted(permission, 'first', undefined, 3, 4);

  expect(callable).toHaveBeenCalledWith('first', undefined, 3, 4);
  expect(actual).toEqual({ args: ['first', undefined, 3, 4], result });
  expect(actual.result).toBe(result);
});

test('preserves the receiver supplied by the caller', () => {
  /**
   * @this {{ prefix: string }}
   * @param {string} suffix Text to append.
   * @returns {string} Combined receiver value.
   */
  function callable(suffix) {
    return `${this.prefix}${suffix}`;
  }
  const adapted = requireAllowEffects(callable);
  const receiver = { prefix: 'value' };

  expect(adapted.call(receiver, permission, '!')).toBe('value!');
});

test('returns the original promise without wrapping it', () => {
  const promise = Promise.resolve('done');
  const adapted = requireAllowEffects(() => promise);

  expect(adapted(permission)).toBe(promise);
});

test('preserves synchronous throws and rejected promise identity', async () => {
  const error = new Error('failure');
  const rejected = Promise.reject(error);
  const sync = requireAllowEffects(() => {
    throw error;
  });
  const async = requireAllowEffects(() => rejected);

  expect(() => sync(permission)).toThrow(error);
  await expect(async(permission)).rejects.toBe(error);
});
