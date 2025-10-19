import { test, expect } from '@jest/globals';

// Dynamically import to ensure coverage at runtime
let getDeepStateCopy;

test('getDeepStateCopy makes a deep clone when imported at runtime', async () => {
  ({ getDeepStateCopy } = await import('../../src/core/browser/data.js'));
  const original = { nested: { value: 'x' } };
  const copy = getDeepStateCopy(original);
  expect(copy).toEqual(original);
  expect(copy).not.toBe(original);
  expect(copy.nested).not.toBe(original.nested);
});
