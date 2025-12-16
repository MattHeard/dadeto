import { describe, test, expect } from '@jest/globals';
import { isValidString } from '../../src/core/commonCore.js';

describe('isValidString', () => {
  test('returns true for non-empty strings', () => {
    const values = ['test', ' ', '0', 'false'];
    for (const val of values) {
      expect(isValidString(val)).toBe(true);
    }
  });

  test('returns false for empty or non-string values', () => {
    const values = ['', null, undefined, 0, false, {}, []];
    for (const v of values) {
      expect(isValidString(v)).toBe(false);
    }
  });
});
