import { describe, test, expect } from '@jest/globals';
import {
  createOpeningTag,
  createTag,
  escapeHtml,
  createHtmlTag,
  wrapHtml,
  getClosingTagParts,
  createClosingTag,
  TAG_OPEN,
  SLASH,
  SPACE,
  TAG_CLOSE,
  EQUALS,
  QUOTE,
} from '../../src/generator/html.js';

describe('html utilities', () => {
  test('createOpeningTag omits space when no attributes', () => {
    expect(createOpeningTag('div')).toBe('<div>');
  });

  test('createOpeningTag adds space when attributes are provided', () => {
    expect(createOpeningTag('div', 'class="c"')).toBe('<div class="c">');
  });

  test('createTag handles empty attributes', () => {
    expect(createTag('span', '', 'x')).toBe('<span>x</span>');
  });

  test('createTag includes attributes when provided', () => {
    expect(createTag('p', 'id="a"', 't')).toBe('<p id="a">t</p>');
  });

  test('escapeHtml replaces special characters', () => {
    expect(escapeHtml('<div>&"')).toBe('&lt;div&gt;&amp;&quot;');
  });

  test('escapeHtml escapes single quotes', () => {
    expect(escapeHtml("O'Reilly")).toBe('O&#039;Reilly');
  });

  test('escapeHtml escapes all special characters together', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#039;');
  });

  test('createHtmlTag wraps content with html lang attribute', () => {
    expect(createHtmlTag('hi')).toBe('<html lang="en">hi</html>');
  });

  test('wrapHtml adds doctype and html tag', () => {
    expect(wrapHtml('hi')).toBe('<!DOCTYPE html><html lang="en">hi</html>');
  });

  test('getClosingTagParts returns correct parts', () => {
    expect(getClosingTagParts('div')).toEqual([
      TAG_OPEN,
      SLASH,
      'div',
      TAG_CLOSE,
    ]);
  });

  test('createClosingTag returns closing tag', () => {
    expect(createClosingTag('span')).toBe('</span>');
  });
});

describe('html constant values', () => {
  test('TAG_OPEN is <', () => {
    expect(TAG_OPEN).toBe('<');
  });

  test('TAG_CLOSE is >', () => {
    expect(TAG_CLOSE).toBe('>');
  });

  test('SPACE is space character', () => {
    expect(SPACE).toBe(' ');
  });

  test('SLASH is forward slash', () => {
    expect(SLASH).toBe('/');
  });

  test('EQUALS is =', () => {
    expect(EQUALS).toBe('=');
  });

  test('QUOTE is "', () => {
    expect(QUOTE).toBe('"');
  });
});
