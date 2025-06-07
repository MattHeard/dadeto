import { test, expect } from '@jest/globals';
import { getDeepStateCopy } from '../../src/browser/toys.js';

test('getDeepStateCopy from toys module clones deeply when imported', () => {
  const original = { nested: { value: 'a' } };
  const copy = getDeepStateCopy(original);
  expect(copy).toEqual(original);
  expect(copy).not.toBe(original);
  expect(copy.nested).not.toBe(original.nested);
});
