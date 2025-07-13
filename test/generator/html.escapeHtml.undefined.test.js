import { test, expect } from '@jest/globals';
import { escapeHtml } from '../../src/generator/html.js';

test('escapeHtml returns empty string for undefined input', () => {
  expect(escapeHtml(undefined)).toBe('');
});
