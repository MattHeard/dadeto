import { describe, test, expect } from '@jest/globals';
import { isEmpty, safeTrim } from '../../src/utils/stringUtils.js';

describe('isEmpty', () => {
  test('returns true for empty or whitespace strings', () => {
    expect(isEmpty('')).toBe(true);
    expect(isEmpty(' ')).toBe(true);
    expect(isEmpty('\t\n')).toBe(true);
  });

  test('returns false for non-empty strings', () => {
    expect(isEmpty('test')).toBe(false);
    expect(isEmpty(' test ')).toBe(false);
    expect(isEmpty('0')).toBe(false);
  });

  test('handles non-string values', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty(0)).toBe(true);
    expect(isEmpty(false)).toBe(true);
    expect(isEmpty({})).toBe(true);
    expect(isEmpty([])).toBe(true);
  });
});

describe('safeTrim', () => {
  test('trims whitespace from strings', () => {
    expect(safeTrim(' test ')).toBe('test');
    expect(safeTrim('  test  ')).toBe('test');
    expect(safeTrim('\ttest\n')).toBe('test');
  });

  test('returns undefined for non-string values', () => {
    expect(safeTrim(null)).toBeUndefined();
    expect(safeTrim(undefined)).toBeUndefined();
    expect(safeTrim(123)).toBeUndefined();
    expect(safeTrim(true)).toBeUndefined();
    expect(safeTrim({})).toBeUndefined();
    expect(safeTrim([])).toBeUndefined();
  });

  test('handles empty strings', () => {
    expect(safeTrim('')).toBe('');
    expect(safeTrim('   ')).toBe('');
  });

  test('handles whitespace with newlines and tabs', () => {
    expect(safeTrim('\n\t  \t')).toBe('');
  });

  test('preserves internal spacing', () => {
    const str = 'te st';
    expect(safeTrim(str)).toBe(str);
  });
});
