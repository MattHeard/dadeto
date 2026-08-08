import {
  asNullableString,
  asStringWithFallback,
  isObjectLike,
  normalizeStringArray,
  toSourceObject,
} from '../../../../src/core/local/notion-codex/valueHelpers.js';

describe('Notion value helpers', () => {
  it('recognizes object-like values and normalizes source objects', () => {
    expect(isObjectLike({ value: 1 })).toBe(true);
    expect(isObjectLike(null)).toBe(false);
    expect(isObjectLike('text')).toBe(false);
    const source = { value: 1 };
    expect(toSourceObject(source)).toBe(source);
    expect(toSourceObject(null)).toEqual({});
  });

  it('normalizes nullable and fallback strings', () => {
    expect(asNullableString('value')).toBe('value');
    expect(asNullableString(1)).toBeNull();
    expect(asStringWithFallback('value', 'fallback')).toBe('value');
    expect(asStringWithFallback(undefined, 'fallback')).toBe('fallback');
  });

  it('forwards string-array normalization', () => {
    expect(normalizeStringArray([' one ', 2, 'two'], ['fallback'])).toEqual([
      'one',
      'two',
    ]);
    expect(normalizeStringArray([], ['fallback'])).toEqual(['fallback']);
  });
});
