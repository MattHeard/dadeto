import { describe, test, expect } from '@jest/globals';
import { isValidText } from '../../src/core/stringUtils.js';
import { isValidString } from '../../src/core/validation.js';

describe.each([
  ['isValidText', isValidText],
  ['isValidString', isValidString],
])('%s', (name, fn) => {
  test('returns true for non-empty strings', () => {
    const values = ['test', ' ', '0', 'false'];
    for (const val of values) {
      expect(fn(val)).toBe(true);
    }
  });

  test('returns false for empty or non-string values', () => {
    const values = ['', null, undefined, 0, false, {}, []];
    for (const v of values) {
      expect(fn(v)).toBe(false);
    }
  });
});
