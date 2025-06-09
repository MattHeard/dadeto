import { test, expect } from '@jest/globals';

// Dynamically import to ensure coverage at runtime
let getDeepStateCopy;

test('getDeepStateCopy dynamically imported from toys makes a deep clone', async () => {
  ({ getDeepStateCopy } = await import('../../src/browser/toys.js'));
  const original = { nested: { arr: [1, 2] } };
  const copy = getDeepStateCopy(original);
  expect(copy).toEqual(original);
  expect(copy).not.toBe(original);
  expect(copy.nested).not.toBe(original.nested);
  expect(copy.nested.arr).not.toBe(original.nested.arr);
});
