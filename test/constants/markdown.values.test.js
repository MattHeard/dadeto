import { describe, test, expect } from '@jest/globals';
import { markdownMarkers, htmlTags } from '../../src/constants/markdown.js';

describe('markdown constant values', () => {
  test('markdownMarkers returns expected mapping', () => {
    const result = markdownMarkers();
    expect(result).toEqual({
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
    });
  });

  test('htmlTags returns expected mapping', () => {
    const result = htmlTags();
    expect(result).toEqual({
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
    });
  });
});
