import { describe, test, expect } from '@jest/globals';
import * as utils from '../../src/utils/index.js';

describe('utils/index', () => {
  test('exports all utility functions', () => {
    expect(typeof utils.isType).toBe('function');
    expect(typeof utils.isValidString).toBe('function');
    expect(typeof utils.isValidBoolean).toBe('function');
    expect(typeof utils.isEmpty).toBe('function');
    expect(typeof utils.isValidText).toBe('function');
    expect(typeof utils.safeTrim).toBe('function');
    expect(typeof utils.escapeRegex).toBe('function');
    expect(typeof utils.createPattern).toBe('function');
    expect(typeof utils.matchesPattern).toBe('function');
    expect(typeof utils.pick).toBe('function');
    expect(typeof utils.mapValues).toBe('function');
  });

  test('exports markdown constants', () => {
    expect(utils.markdownMarkers).toBeDefined();
    expect(utils.htmlTags).toBeDefined();
    expect(utils.cssClasses).toBeDefined();
    expect(utils.defaultOptions).toBeDefined();
  });

  test('markdown constants values are correct', () => {
    const MARKDOWN_MARKERS = utils.markdownMarkers();
    const HTML_TAGS = utils.htmlTags();
    const CSS_CLASSES = utils.cssClasses();
    const DEFAULT_OPTIONS = utils.defaultOptions();
    expect(MARKDOWN_MARKERS.ASTERISK).toBe('*');
    expect(HTML_TAGS.EMPHASIS).toBe('em');
    expect(CSS_CLASSES.CONTAINER).toBe('markdown-container');
    expect(DEFAULT_OPTIONS.gfm).toBe(true);
    expect(HTML_TAGS.LINK).toBe('a');
    expect(CSS_CLASSES.LINK).toBe('markdown-link');
    expect(DEFAULT_OPTIONS.tables).toBe(true);
    expect(DEFAULT_OPTIONS.langPrefix).toBe('language-');
  });

  test('markdown marker characters are correct', () => {
    const MARKDOWN_MARKERS = utils.markdownMarkers();
    expect(MARKDOWN_MARKERS.UNDERSCORE).toBe('_');
    expect(MARKDOWN_MARKERS.BACKTICK).toBe('`');
    expect(MARKDOWN_MARKERS.TILDE).toBe('~');
    expect(MARKDOWN_MARKERS.DASH).toBe('-');
    expect(MARKDOWN_MARKERS.EQUAL).toBe('=');
    expect(MARKDOWN_MARKERS.HASH).toBe('#');
    expect(MARKDOWN_MARKERS.GREATER_THAN).toBe('>');
    expect(MARKDOWN_MARKERS.PIPE).toBe('|');
    expect(MARKDOWN_MARKERS.BACKSLASH).toBe('\\');
    expect(MARKDOWN_MARKERS.SLASH).toBe('/');
    expect(MARKDOWN_MARKERS.EXCLAMATION).toBe('!');
    expect(MARKDOWN_MARKERS.BRACKET_OPEN).toBe('[');
    expect(MARKDOWN_MARKERS.BRACKET_CLOSE).toBe(']');
    expect(MARKDOWN_MARKERS.PAREN_OPEN).toBe('(');
    expect(MARKDOWN_MARKERS.PAREN_CLOSE).toBe(')');
  });

  test('additional html tag constants are correct', () => {
    const HTML_TAGS = utils.htmlTags();
    expect(HTML_TAGS.STRONG).toBe('strong');
    expect(HTML_TAGS.CODE).toBe('code');
    expect(HTML_TAGS.PARAGRAPH).toBe('p');
    expect(HTML_TAGS.BLOCKQUOTE).toBe('blockquote');
  });

  test('remaining html tag constants are correct', () => {
    const HTML_TAGS = utils.htmlTags();
    const CSS_CLASSES = utils.cssClasses();
    expect(HTML_TAGS.LIST).toBe('ul');
    expect(HTML_TAGS.LIST_ITEM).toBe('li');
    expect(HTML_TAGS.ORDERED_LIST).toBe('ol');
    expect(HTML_TAGS.HORIZONTAL_RULE).toBe('hr');
    expect(HTML_TAGS.LINE_BREAK).toBe('br');
    expect(HTML_TAGS.IMAGE).toBe('img');
    expect(HTML_TAGS.DIV).toBe('div');
    expect(HTML_TAGS.SPAN).toBe('span');
    expect(HTML_TAGS.PRE).toBe('pre');
    expect(CSS_CLASSES.HORIZONTAL_RULE).toBe('markdown-hr');
  });

  test('additional default option values are correct', () => {
    const DEFAULT_OPTIONS = utils.defaultOptions();
    expect(DEFAULT_OPTIONS.breaks).toBe(false);
    expect(DEFAULT_OPTIONS.pedantic).toBe(false);
    expect(DEFAULT_OPTIONS.sanitize).toBe(false);
    expect(DEFAULT_OPTIONS.smartLists).toBe(true);
    expect(DEFAULT_OPTIONS.smartypants).toBe(false);
    expect(DEFAULT_OPTIONS.xhtml).toBe(false);
    expect(DEFAULT_OPTIONS.headerIds).toBe(true);
    expect(DEFAULT_OPTIONS.headerPrefix).toBe('');
    expect(DEFAULT_OPTIONS.mangle).toBe(true);
    expect(DEFAULT_OPTIONS.highlight).toBeNull();
    expect(DEFAULT_OPTIONS.baseUrl).toBeNull();
    expect(DEFAULT_OPTIONS.linkTarget).toBeNull();
    expect(DEFAULT_OPTIONS.renderer).toBeNull();
  });
});
