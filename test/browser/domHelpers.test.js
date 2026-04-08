import { test, expect } from '@jest/globals';
import { hasDomHelpersModule } from '../../src/core/browser/domHelpers.js';

test('domHelpers module loads without runtime exports', () => {
  expect(hasDomHelpersModule()).toBe(true);
});
