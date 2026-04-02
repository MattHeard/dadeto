import { jest } from '@jest/globals';
import {
  areValidStrings,
  assertFunction,
  ensureString,
  getStringCandidate,
  isNonNullObject,
  isNullish,
  isValidString,
  normalizeNonStringValue,
  stringOrFallback,
  whenString,
  whenArray,
  whenTruthy,
  whenOrNull,
  whenNotNullish,
  functionOrFallback,
  guardThen,
  numberOrZero,
  when,
  tryOr,
} from '../../src/core/commonCore.js';

describe('commonCore helpers', () => {
  test('base validators and normalizers behave as expected', () => {
    expect(isValidString('hello')).toBe(true);
    expect(isValidString('')).toBe(false);
    expect(areValidStrings('a', 'b', 'c')).toBe(true);
    expect(areValidStrings('a', '', 'c')).toBe(false);
    expect(isNullish(null)).toBe(true);
    expect(isNullish(undefined)).toBe(true);
    expect(isNullish('hello')).toBe(false);
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

  test('stringOrFallback defers to the fallback when value is not a string', () => {
    const fallback = jest.fn(() => 'fallback-value');
    expect(stringOrFallback(123, fallback)).toBe('fallback-value');
    expect(fallback).toHaveBeenCalledWith(123);
  });

  test('whenString executes the callback for strings only', () => {
    expect(whenString('hello', value => value.toUpperCase())).toBe('HELLO');
    expect(whenString(123, value => value)).toBeNull();
  });

  test('whenNotNullish executes the callback for present values only', () => {
    expect(whenNotNullish('hello', value => value)).toBe('hello');
    expect(whenNotNullish(null, value => value)).toBeNull();
    expect(whenNotNullish(undefined, value => value)).toBeNull();
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
