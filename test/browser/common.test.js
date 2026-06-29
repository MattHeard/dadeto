import { describe, expect, it, jest } from '@jest/globals';
import {
  buildWhen,
  isObject,
  normalizePositiveInteger,
  withFallback,
} from '../../src/core/browser/common.js';

describe('browser/common', () => {
  it('recognizes ordinary objects and rejects nullish or array values', () => {
    expect(isObject({})).toBe(true);
    expect(isObject(null)).toBe(false);
    expect(isObject([])).toBe(false);
    expect(isObject('value')).toBe(false);
  });

  it('returns the transform result or the fallback', () => {
    const transform = jest.fn(() => 'mapped');

    expect(withFallback(true, transform, 'fallback')).toBe('mapped');
    expect(withFallback(false, transform, 'fallback')).toBe('fallback');
    expect(transform).toHaveBeenCalledTimes(1);
  });

  it('builds only when the condition is true', () => {
    const builder = jest.fn(() => ({ ok: true }));

    expect(buildWhen(true, builder)).toEqual({ ok: true });
    expect(buildWhen(false, builder)).toBeNull();
    expect(builder).toHaveBeenCalledTimes(1);
  });

  it('normalizes positive integers and preserves the fallback otherwise', () => {
    expect(normalizePositiveInteger('3.2', 9)).toBe(3);
    expect(normalizePositiveInteger(0, 9)).toBe(9);
    expect(normalizePositiveInteger(Number.NaN, 9)).toBe(9);
  });
});
