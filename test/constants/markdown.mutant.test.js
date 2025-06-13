import { describe, test, expect } from '@jest/globals';
import {
  cssClasses,
  htmlTags,
  markdownMarkers,
  defaultOptions,
} from '../../src/constants/markdown.js';

// Additional coverage to kill Stryker mutants around CSS_CLASSES values

describe('markdown constants mutants', () => {
  test('CSS_CLASSES object has expected values', () => {
    const CSS_CLASSES = cssClasses();
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


  test('DEFAULT_OPTIONS object has expected values', () => {
    const DEFAULT_OPTIONS = defaultOptions();
    expect(DEFAULT_OPTIONS).toEqual({
      gfm: true,
      tables: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false,
      xhtml: false,
      highlight: null,
      langPrefix: 'language-',
      headerIds: true,
      headerPrefix: '',
      mangle: true,
      baseUrl: null,
      linkTarget: null,
      renderer: null,
    });
  });

  test('constant objects are frozen', () => {
    const MARKDOWN_MARKERS = markdownMarkers();
    const HTML_TAGS = htmlTags();
    const CSS_CLASSES = cssClasses();
    const DEFAULT_OPTIONS = defaultOptions();
    expect(Object.isFrozen(MARKDOWN_MARKERS)).toBe(true);
    expect(Object.isFrozen(HTML_TAGS)).toBe(true);
    expect(Object.isFrozen(CSS_CLASSES)).toBe(true);
    expect(Object.isFrozen(DEFAULT_OPTIONS)).toBe(true);
  });

  test('constant objects cannot be modified', () => {
    const MARKDOWN_MARKERS = markdownMarkers();
    const HTML_TAGS = htmlTags();
    const CSS_CLASSES = cssClasses();
    const DEFAULT_OPTIONS = defaultOptions();
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
