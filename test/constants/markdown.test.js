import { describe, test, expect } from '@jest/globals';
import { HTML_TAGS, DEFAULT_OPTIONS } from '../../src/constants/markdown.js';

describe('markdown constants', () => {
  test('HTML_TAGS contains expected tag names', () => {
    expect(HTML_TAGS.DIV).toBe('div');
    expect(HTML_TAGS.SPAN).toBe('span');
    expect(HTML_TAGS.PRE).toBe('pre');
  });

  test('DEFAULT_OPTIONS has correct default values', () => {
    expect(DEFAULT_OPTIONS.breaks).toBe(false);
    expect(DEFAULT_OPTIONS.sanitize).toBe(false);
    expect(DEFAULT_OPTIONS.smartLists).toBe(true);
    expect(DEFAULT_OPTIONS.smartypants).toBe(false);
    expect(DEFAULT_OPTIONS.xhtml).toBe(false);
    expect(DEFAULT_OPTIONS.headerIds).toBe(true);
    expect(DEFAULT_OPTIONS.headerPrefix).toBe('');
    expect(DEFAULT_OPTIONS.mangle).toBe(true);
  });
});
