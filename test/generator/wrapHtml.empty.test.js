import { describe, test, expect } from '@jest/globals';
import { wrapHtml } from '../../src/generator/html.js';

describe('wrapHtml empty content', () => {
  test('includes doctype and html wrapper even when content is empty', () => {
    expect(wrapHtml('')).toBe('<!DOCTYPE html><html lang="en"></html>');
  });
});
