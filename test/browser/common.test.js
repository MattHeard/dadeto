import { describe, expect, it, jest } from '@jest/globals';
import {
  buildWhen,
  isObject,
  normalizePositiveInteger,
  withFallback,
} from '../../src/core/browser/common.js';

describe('browser/common', () => {
  it('conditional builders retain falsy successes, laziness and thrown identity', () => {
    for (const value of [0, false, '', undefined, null, { original: true }]) {
      const builder = jest.fn(() => value);
      expect(buildWhen(false, builder)).toBeNull();
      expect(builder).not.toHaveBeenCalled();
      expect(buildWhen(true, builder)).toBe(value);
      expect(builder).toHaveBeenCalledTimes(1);
    }
    const failure = { original: true };
    let caught;
    try {
      buildWhen(true, () => {
        throw failure;
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
    expect(buildWhen.name).toBe('buildWhen');
  });
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
