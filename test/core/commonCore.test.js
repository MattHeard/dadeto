import { jest } from '@jest/globals';
import {
  stringOrFallback,
  whenString,
  whenNotNullish,
  functionOrFallback,
  guardThen,
  isObjectValue,
  numberOrZero,
  when,
  tryOr,
} from '../../src/core/commonCore.js';

describe('commonCore helpers', () => {
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

  test('isObjectValue returns true only for object-like values', () => {
    expect(isObjectValue({})).toBe(true);
    expect(isObjectValue(null)).toBe(false);
    expect(isObjectValue('value')).toBe(false);
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
