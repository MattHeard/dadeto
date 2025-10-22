import { test, expect } from '@jest/globals';
import { escapeHtml } from '../../src/build/html.js';

test('escapeHtml returns original string when no characters need escaping', () => {
  const input = 'Hello World';
  const result = escapeHtml(input);
  expect(result).toBe('Hello World');
});
