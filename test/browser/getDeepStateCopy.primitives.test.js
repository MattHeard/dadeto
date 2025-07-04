import { describe, test, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

describe('getDeepStateCopy primitives', () => {
  test.each([42, 'abc', true, null])(
    'returns value unchanged for %p',
    value => {
      expect(getDeepStateCopy(value)).toBe(value);
    }
  );
});
