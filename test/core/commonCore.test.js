import { jest } from '@jest/globals';
import {
  assertFunction,
  ensureString,
  arrayOrEmpty,
  getStringCandidate,
  isNonNullObject,
  isNullish,
  isValidString,
  normalizeNonStringValue,
  normalizeValueWithLimit,
  resolveMessageOrDefault,
  stringOrNull,
  stringOrFallback,
  whenString,
  whenType,
  whenTypeValue,
  whenPredicateValue,
  trimmedStringOrEmpty,
  trimmedStringOrNull,
  whenArray,
  whenTruthy,
  whenOrNull,
  whenNotNullish,
  whenNotNullishValue,
  guardThen,
  numberOrZero,
  when,
  tryOr,
} from '../../src/core/commonCore.js';
import {
  areValidStrings,
  functionOrFallback,
  isBlankStringValue,
  isNullishOrEmptyString,
  normalizeObjectOrFallback,
  reportAndReturnFalse,
  whenOrDefault,
} from '../../src/core/browser/browser-core.js';

describe('commonCore helpers', () => {
  test('base validators and normalizers behave as expected', () => {
    expect(isValidString('hello')).toBe(true);
    expect(isValidString('')).toBe(false);
    expect(areValidStrings('a', 'b', 'c')).toBe(true);
    expect(areValidStrings('a', '', 'c')).toBe(false);
    expect(isNullish(null)).toBe(true);
    expect(isNullish(undefined)).toBe(true);
    expect(isNullish('hello')).toBe(false);
    expect(isBlankStringValue('   ')).toBe(true);
    expect(isBlankStringValue('hello')).toBe(false);
    expect(isBlankStringValue(123)).toBe(false);
    expect(arrayOrEmpty(['hello'])).toEqual(['hello']);
    expect(arrayOrEmpty('hello')).toEqual([]);
    expect(isNonNullObject({ hello: 'world' })).toBe(true);
    expect(isNonNullObject(null)).toBe(false);
  });

  test('assertFunction accepts callables and rejects non-functions', () => {
    expect(() => assertFunction(() => {}, 'fn')).not.toThrow();
    expect(() => assertFunction('nope', 'fn')).toThrow('fn must be a function');
  });

  test('string candidate helpers normalize strings predictably', () => {
    expect(getStringCandidate('hello')).toBe('hello');
    expect(getStringCandidate(123)).toBeUndefined();
    expect(ensureString('hello')).toBe('hello');
    expect(ensureString(123)).toBe('');
    expect(normalizeNonStringValue('hello')).toBe('hello');
    expect(normalizeNonStringValue(null)).toBe('');
    expect(normalizeNonStringValue(123)).toBe('123');
  });

  test('string normalization helpers return strings or fallbacks predictably', () => {
    expect(stringOrNull('hello')).toBe('hello');
    expect(stringOrNull(123)).toBeNull();
    expect(resolveMessageOrDefault('hello', 'fallback')).toBe('hello');
    expect(resolveMessageOrDefault(123, 'fallback')).toBe('fallback');
  });

  test('reportAndReturnFalse invokes the reporter and returns false', () => {
    const reporter = jest.fn();
    expect(reportAndReturnFalse(reporter, 'alpha', 'beta')).toBe(false);
    expect(reporter).toHaveBeenCalledWith('alpha', 'beta');
  });

  test('stringOrFallback defers to the fallback when value is not a string', () => {
    const fallback = jest.fn(() => 'fallback-value');
    expect(stringOrFallback(123, fallback)).toBe('fallback-value');
    expect(fallback).toHaveBeenCalledWith(123);
  });

  test('whenString executes the callback for strings only', () => {
    expect(whenString('hello', value => value.toUpperCase())).toBe('HELLO');
    expect(whenString(123, value => value)).toBeNull();
  });

  test('normalizeValueWithLimit normalizes first and truncates second', () => {
    expect(
      normalizeValueWithLimit('  hello  ', 3, value => String(value).trim())
    ).toBe('hel');
    expect(
      normalizeValueWithLimit(null, 10, value => String(value ?? '').trim())
    ).toBe('');
  });

  test('normalizeObjectOrFallback uses fallback for non-objects and maps objects', () => {
    const fallback = jest.fn(() => ({ fallback: true }));
    const transform = jest.fn(value => ({ ...value, mapped: true }));
    expect(normalizeObjectOrFallback(null, fallback, transform)).toEqual({
      fallback: true,
    });
    expect(
      normalizeObjectOrFallback({ hello: 'world' }, fallback, transform)
    ).toEqual({
      hello: 'world',
      mapped: true,
    });
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(transform).toHaveBeenCalledTimes(1);
  });

  test('isNullishOrEmptyString detects missing string-like values', () => {
    expect(isNullishOrEmptyString(null)).toBe(true);
    expect(isNullishOrEmptyString(undefined)).toBe(true);
    expect(isNullishOrEmptyString('')).toBe(true);
    expect(isNullishOrEmptyString('value')).toBe(false);
  });

  test('whenType executes the callback for the requested typeof only', () => {
    expect(whenType('hello', 'string', value => value.toUpperCase())).toBe(
      'HELLO'
    );
    expect(whenType(123, 'string', value => value)).toBeNull();
    expect(
      whenType(
        () => {},
        'function',
        value => value
      )
    ).toEqual(expect.any(Function));
  });

  test('whenTypeValue returns the original value for matching typeof inputs', () => {
    expect(whenTypeValue('hello', 'string')).toBe('hello');
    expect(whenTypeValue(123, 'number')).toBe(123);
    expect(whenTypeValue({}, 'function')).toBeNull();
  });

  test('whenPredicateValue returns the original value when predicate accepts it', () => {
    expect(whenPredicateValue('hello', value => value.length > 2)).toBe(
      'hello'
    );
    expect(whenPredicateValue('hi', value => value.length > 2)).toBeNull();
  });

  test('trimmedStringOrEmpty returns a trimmed string or an empty string', () => {
    expect(trimmedStringOrEmpty('  hello  ')).toBe('hello');
    expect(trimmedStringOrEmpty('')).toBe('');
    expect(trimmedStringOrEmpty(123)).toBe('');
  });

  test('trimmedStringOrNull returns a trimmed string or null', () => {
    expect(trimmedStringOrNull('  hello  ')).toBe('hello');
    expect(trimmedStringOrNull('   ')).toBeNull();
    expect(trimmedStringOrNull(123)).toBeNull();
  });

  test('whenNotNullish executes the callback for present values only', () => {
    expect(whenNotNullish('hello', value => value)).toBe('hello');
    expect(whenNotNullish(null, value => value)).toBeNull();
    expect(whenNotNullish(undefined, value => value)).toBeNull();
  });

  test('whenNotNullishValue returns the original value when present', () => {
    expect(whenNotNullishValue('hello')).toBe('hello');
    expect(whenNotNullishValue(0)).toBe(0);
    expect(whenNotNullishValue(null)).toBeNull();
    expect(whenNotNullishValue(undefined)).toBeNull();
  });

  test('whenArray executes the callback for arrays only', () => {
    expect(whenArray(['hello'], value => value.slice())).toEqual(['hello']);
    expect(whenArray('hello', value => value)).toBeNull();
  });

  test('whenTruthy executes the callback for truthy values only', () => {
    expect(whenTruthy('hello', value => value.toUpperCase())).toBe('HELLO');
    expect(whenTruthy('', value => value)).toBeNull();
  });

  test('whenOrNull executes the callback when the condition passes', () => {
    expect(whenOrNull(true, () => 'ok')).toBe('ok');
    expect(whenOrNull(false, () => 'nope')).toBeNull();
  });

  test('whenOrDefault returns the fallback when the condition fails', () => {
    expect(whenOrDefault(true, () => 'ok', 'nope')).toBe('ok');
    expect(whenOrDefault(false, () => 'ok', 'nope')).toBe('nope');
  });

  test('functionOrFallback returns a callable candidate or the fallback', () => {
    const fallback = () => () => 'fallback';
    expect(functionOrFallback(() => 'value', fallback)()).toBe('value');
    expect(functionOrFallback(123, fallback)()).toBe('fallback');
  });

  test('guardThen runs the effect only when condition is true', () => {
    const effect = jest.fn();
    expect(guardThen(false, effect)).toBe(false);
    expect(effect).not.toHaveBeenCalled();
    expect(guardThen(true, effect)).toBe(true);
    expect(effect).toHaveBeenCalled();
  });

  test('numberOrZero returns numeric values or zero for other inputs', () => {
    expect(numberOrZero(42)).toBe(42);
    expect(numberOrZero('42')).toBe(0);
    expect(numberOrZero(undefined)).toBe(0);
  });

  test('when returns transform when condition passes and fallback when it fails', () => {
    const transform = () => 'transformed';
    const fallback = () => 'fallback';
    expect(when(true, transform, fallback)).toBe('transformed');
    expect(when(false, transform, fallback)).toBe('fallback');
  });

  test('tryOr returns fallback when action throws', () => {
    const fallback = () => 'safe';
    expect(tryOr(() => 'ok', fallback)).toBe('ok');
    expect(
      tryOr(() => {
        throw new Error('boom');
      }, fallback)
    ).toBe('safe');
  });
});
