import { describe, test, expect } from '@jest/globals';
import {
  cssClasses,
  htmlTags,
  markdownMarkers,
  defaultOptions,
} from '../../src/constants/markdown.js';

// Additional coverage to kill Stryker mutants around CSS_CLASSES values

describe('markdown constants mutants', () => {
  const constantTests = [
    [
      'CSS_CLASSES',
      cssClasses,
      {
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
      },
    ],
    [
      'MARKDOWN_MARKERS',
      markdownMarkers,
      {
        ASTERISK: '*',
        UNDERSCORE: '_',
        BACKTICK: '`',
        TILDE: '~',
        DASH: '-',
        EQUAL: '=',
        HASH: '#',
        GREATER_THAN: '>',
        PIPE: '|',
        BACKSLASH: '\\',
        SLASH: '/',
        EXCLAMATION: '!',
        BRACKET_OPEN: '[',
        BRACKET_CLOSE: ']',
        PAREN_OPEN: '(',
        PAREN_CLOSE: ')',
      },
    ],
    [
      'HTML_TAGS',
      htmlTags,
      {
        EMPHASIS: 'em',
        STRONG: 'strong',
        CODE: 'code',
        PARAGRAPH: 'p',
        BLOCKQUOTE: 'blockquote',
        LIST: 'ul',
        LIST_ITEM: 'li',
        ORDERED_LIST: 'ol',
        HORIZONTAL_RULE: 'hr',
        LINE_BREAK: 'br',
        LINK: 'a',
        IMAGE: 'img',
        DIV: 'div',
        SPAN: 'span',
        PRE: 'pre',
      },
    ],
    [
      'DEFAULT_OPTIONS',
      defaultOptions,
      {
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
      },
    ],
  ];

  test.each(constantTests)(
    '%s object has expected values',
    (_name, fn, expected) => {
      expect(fn()).toEqual(expected);
    }
  );

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
