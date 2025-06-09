import { describe, test, expect } from '@jest/globals';
import {
  htmlTags,
  defaultOptions,
  cssClasses,
} from '../../src/constants/markdown.js';

describe('markdown constants', () => {
  test('HTML_TAGS contains expected tag names', () => {
    const HTML_TAGS = htmlTags();
    expect(HTML_TAGS.DIV).toBe('div');
    expect(HTML_TAGS.SPAN).toBe('span');
    expect(HTML_TAGS.PRE).toBe('pre');
  });

  test('HTML_TAGS includes list and rule tags', () => {
    const HTML_TAGS = htmlTags();
    expect(HTML_TAGS.LIST).toBe('ul');
    expect(HTML_TAGS.LIST_ITEM).toBe('li');
    expect(HTML_TAGS.ORDERED_LIST).toBe('ol');
    expect(HTML_TAGS.HORIZONTAL_RULE).toBe('hr');
    expect(HTML_TAGS.LINE_BREAK).toBe('br');
    expect(HTML_TAGS.IMAGE).toBe('img');
  });

  test('DEFAULT_OPTIONS has correct default values', () => {
    const DEFAULT_OPTIONS = defaultOptions();
    expect(DEFAULT_OPTIONS.breaks).toBe(false);
    expect(DEFAULT_OPTIONS.sanitize).toBe(false);
    expect(DEFAULT_OPTIONS.smartLists).toBe(true);
    expect(DEFAULT_OPTIONS.smartypants).toBe(false);
    expect(DEFAULT_OPTIONS.xhtml).toBe(false);
    expect(DEFAULT_OPTIONS.headerIds).toBe(true);
    expect(DEFAULT_OPTIONS.headerPrefix).toBe('');
    expect(DEFAULT_OPTIONS.mangle).toBe(true);
  });

  test('CSS_CLASSES includes heading and paragraph classes', () => {
    const CSS_CLASSES = cssClasses();
    expect(CSS_CLASSES.HEADING).toBe('markdown-heading');
    expect(CSS_CLASSES.PARAGRAPH).toBe('markdown-paragraph');
  });

  test('CSS_CLASSES includes a code class', () => {
    const CSS_CLASSES = cssClasses();
    expect(CSS_CLASSES.CODE).toBe('markdown-code');
  });

  test('CSS_CLASSES includes list related classes', () => {
    const CSS_CLASSES = cssClasses();
    expect(CSS_CLASSES.LIST).toBe('markdown-list');
    expect(CSS_CLASSES.LIST_ITEM).toBe('markdown-list-item');
    expect(CSS_CLASSES.BLOCKQUOTE).toBe('markdown-blockquote');
    expect(CSS_CLASSES.INLINE_CODE).toBe('markdown-inline-code');
    expect(CSS_CLASSES.IMAGE).toBe('markdown-image');
    expect(CSS_CLASSES.HORIZONTAL_RULE).toBe('markdown-hr');
  });
});
