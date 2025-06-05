import { describe, test, expect } from '@jest/globals';
import {
  CSS_CLASSES,
  HTML_TAGS,
  MARKDOWN_MARKERS,
  DEFAULT_OPTIONS,
} from '../../src/constants/markdown.js';

// Additional coverage to kill Stryker mutants around CSS_CLASSES values

describe('markdown constants mutants', () => {
  test('CSS_CLASSES object has expected values', () => {
    expect(CSS_CLASSES).toEqual({
      CONTAINER: 'markdown-container',
      HEADING: 'markdown-heading',
      PARAGRAPH: 'markdown-paragraph',
      LIST: 'markdown-list',
      LIST_ITEM: 'markdown-list-item',
      BLOCKQUOTE: 'markdown-blockquote',
      CODE: 'markdown-code',
      INLINE_CODE: 'markdown-inline-code',
      LINK: 'markdown-link',
      IMAGE: 'markdown-image',
      HORIZONTAL_RULE: 'markdown-hr',
    });
  });

  test('constant objects are frozen', () => {
    expect(Object.isFrozen(MARKDOWN_MARKERS)).toBe(true);
    expect(Object.isFrozen(HTML_TAGS)).toBe(true);
    expect(Object.isFrozen(CSS_CLASSES)).toBe(true);
    expect(Object.isFrozen(DEFAULT_OPTIONS)).toBe(true);
  });

  test('constant objects cannot be modified', () => {
    expect(() => {
      MARKDOWN_MARKERS.ASTERISK = 'changed';
    }).toThrow();
    expect(() => {
      HTML_TAGS.EMPHASIS = 'changed';
    }).toThrow();
    expect(() => {
      CSS_CLASSES.CONTAINER = 'changed';
    }).toThrow();
    expect(() => {
      DEFAULT_OPTIONS.gfm = false;
    }).toThrow();
  });
});
