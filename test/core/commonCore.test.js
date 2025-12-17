import { jest } from '@jest/globals';
import {
  stringOrDefault,
  stringOrFallback,
  whenString,
  functionOrFallback,
  guardThen,
  when,
  tryOr,
} from '../../src/core/commonCore.js';

describe('commonCore helpers', () => {
  test('stringOrDefault returns provided string or fallback', () => {
    expect(stringOrDefault('value', 'fallback')).toBe('value');
    expect(stringOrDefault(123, 'fallback')).toBe('fallback');
    expect(stringOrDefault(123, null)).toBeNull();
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
