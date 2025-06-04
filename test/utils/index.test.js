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
    expect(utils.MARKDOWN_MARKERS).toBeDefined();
    expect(utils.HTML_TAGS).toBeDefined();
    expect(utils.CSS_CLASSES).toBeDefined();
    expect(utils.DEFAULT_OPTIONS).toBeDefined();
  });

  test('markdown constants values are correct', () => {
    expect(utils.MARKDOWN_MARKERS.ASTERISK).toBe('*');
    expect(utils.HTML_TAGS.EMPHASIS).toBe('em');
    expect(utils.CSS_CLASSES.CONTAINER).toBe('markdown-container');
    expect(utils.DEFAULT_OPTIONS.gfm).toBe(true);
    expect(utils.HTML_TAGS.LINK).toBe('a');
    expect(utils.CSS_CLASSES.LINK).toBe('markdown-link');
    expect(utils.DEFAULT_OPTIONS.tables).toBe(true);
    expect(utils.DEFAULT_OPTIONS.langPrefix).toBe('language-');
  });

  test('markdown marker characters are correct', () => {
    expect(utils.MARKDOWN_MARKERS.UNDERSCORE).toBe('_');
    expect(utils.MARKDOWN_MARKERS.BACKTICK).toBe('`');
    expect(utils.MARKDOWN_MARKERS.TILDE).toBe('~');
    expect(utils.MARKDOWN_MARKERS.DASH).toBe('-');
    expect(utils.MARKDOWN_MARKERS.EQUAL).toBe('=');
    expect(utils.MARKDOWN_MARKERS.HASH).toBe('#');
    expect(utils.MARKDOWN_MARKERS.GREATER_THAN).toBe('>');
    expect(utils.MARKDOWN_MARKERS.PIPE).toBe('|');
    expect(utils.MARKDOWN_MARKERS.BACKSLASH).toBe('\\');
    expect(utils.MARKDOWN_MARKERS.SLASH).toBe('/');
    expect(utils.MARKDOWN_MARKERS.EXCLAMATION).toBe('!');
    expect(utils.MARKDOWN_MARKERS.BRACKET_OPEN).toBe('[');
    expect(utils.MARKDOWN_MARKERS.BRACKET_CLOSE).toBe(']');
    expect(utils.MARKDOWN_MARKERS.PAREN_OPEN).toBe('(');
    expect(utils.MARKDOWN_MARKERS.PAREN_CLOSE).toBe(')');
  });

  test('additional html tag constants are correct', () => {
    expect(utils.HTML_TAGS.STRONG).toBe('strong');
    expect(utils.HTML_TAGS.CODE).toBe('code');
    expect(utils.HTML_TAGS.PARAGRAPH).toBe('p');
    expect(utils.HTML_TAGS.BLOCKQUOTE).toBe('blockquote');
  });

  test('remaining html tag constants are correct', () => {
    expect(utils.HTML_TAGS.LIST).toBe('ul');
    expect(utils.HTML_TAGS.LIST_ITEM).toBe('li');
    expect(utils.HTML_TAGS.ORDERED_LIST).toBe('ol');
    expect(utils.HTML_TAGS.HORIZONTAL_RULE).toBe('hr');
    expect(utils.HTML_TAGS.LINE_BREAK).toBe('br');
    expect(utils.HTML_TAGS.IMAGE).toBe('img');
    expect(utils.HTML_TAGS.DIV).toBe('div');
    expect(utils.HTML_TAGS.SPAN).toBe('span');
    expect(utils.HTML_TAGS.PRE).toBe('pre');
  });

  test('additional default option values are correct', () => {
    expect(utils.DEFAULT_OPTIONS.breaks).toBe(false);
    expect(utils.DEFAULT_OPTIONS.pedantic).toBe(false);
    expect(utils.DEFAULT_OPTIONS.sanitize).toBe(false);
    expect(utils.DEFAULT_OPTIONS.smartLists).toBe(true);
    expect(utils.DEFAULT_OPTIONS.smartypants).toBe(false);
    expect(utils.DEFAULT_OPTIONS.xhtml).toBe(false);
    expect(utils.DEFAULT_OPTIONS.headerIds).toBe(true);
    expect(utils.DEFAULT_OPTIONS.headerPrefix).toBe('');
    expect(utils.DEFAULT_OPTIONS.mangle).toBe(true);
    expect(utils.DEFAULT_OPTIONS.highlight).toBeNull();
    expect(utils.DEFAULT_OPTIONS.baseUrl).toBeNull();
    expect(utils.DEFAULT_OPTIONS.linkTarget).toBeNull();
    expect(utils.DEFAULT_OPTIONS.renderer).toBeNull();
  });
});
