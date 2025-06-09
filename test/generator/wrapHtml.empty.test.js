import { test, expect } from '@jest/globals';
import { wrapHtml } from '../../src/generator/html.js';

test('wrapHtml handles empty content', () => {
  const result = wrapHtml('');
  expect(result).toBe('<!DOCTYPE html><html lang="en"></html>');
});
