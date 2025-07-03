import { test, expect } from '@jest/globals';

// Dynamically import with cache-busting query to avoid module caching
/**
 * Load the module with a cache-busting query string.
 *
 * @returns {Promise<Function>} getDeepStateCopy function from the module
 */
async function loadModule() {
  const suffix = `?cacheBust=${Date.now()}`;
  const module = await import(`../../src/browser/toys.js${suffix}`);
  return module.getDeepStateCopy;
}

test('getDeepStateCopy dynamically imported with cache busting returns deep copy', async () => {
  const getDeepStateCopy = await loadModule();
  const original = { level1: { value: 'x' } };
  const copy = getDeepStateCopy(original);
  expect(copy).toEqual(original);
  expect(copy).not.toBe(original);
  expect(copy.level1).not.toBe(original.level1);
});
