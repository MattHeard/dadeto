import { test, expect } from '@jest/globals';
import { DOM_HELPERS_MARKER } from '../../src/core/browser/domHelpers.js';

test('domHelpers module loads without runtime exports', () => {
  expect(DOM_HELPERS_MARKER).toBe(true);
});
