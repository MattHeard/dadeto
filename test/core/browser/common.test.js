import { describe, expect, test, jest } from '@jest/globals';
import {
  buildWhen,
  guardThen,
  isObject,
  normalizePositiveInteger,
  withFallback,
} from '../../../src/core/browser/common.js';

describe('browser common helpers', () => {
  test('detects ordinary objects only', () => {
    expect(isObject({})).toBe(true);
    expect(isObject([])).toBe(false);
    expect(isObject(null)).toBe(false);
  });

  test('evaluates fallback and builder helpers', () => {
    const builder = jest.fn(() => 'built');
    const transform = jest.fn(() => 'transformed');

    expect(withFallback(true, transform, 'fallback')).toBe('transformed');
    expect(withFallback(false, transform, 'fallback')).toBe('fallback');
    expect(buildWhen(true, builder)).toBe('built');
    expect(buildWhen(false, builder)).toBeNull();
  });

  test('normalizes positive integers and supports guardThen', () => {
    const effect = jest.fn();

    expect(normalizePositiveInteger('2.2', 9)).toBe(2);
    expect(normalizePositiveInteger('0', 9)).toBe(9);
    expect(normalizePositiveInteger('not a number', 9)).toBe(9);
    expect(guardThen(true, effect)).toBe(true);
    expect(guardThen(false, effect)).toBe(false);
    expect(effect).toHaveBeenCalledTimes(1);
  });
});
