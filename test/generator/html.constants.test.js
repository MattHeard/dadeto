import { describe, test, expect } from '@jest/globals';
import {
  doctype,
  language,
  htmlTagName,
  attrName,
  htmlEscapeReplacements,
  escapeHtml,
} from '../../src/generator/html.js';

describe('html constants', () => {
  test('DOCTYPE constant is correct', () => {
    expect(doctype()).toBe('<!DOCTYPE html>');
  });

  test('LANGUAGE constants include EN', () => {
    expect(language()).toEqual({ EN: 'en' });
    expect(Object.isFrozen(language())).toBe(false);
  });

  test('HTML_TAG_NAME constant is html', () => {
    expect(htmlTagName()).toBe('html');
  });

  test('ATTR_NAME constants', () => {
    expect(attrName()).toEqual({ LANG: 'lang', CLASS: 'class', ID: 'id' });
  });

  test('HTML_ESCAPE_REPLACEMENTS contains standard replacements', () => {
    const expected = [
      { from: /&/g, to: '&amp;' },
      { from: /</g, to: '&lt;' },
      { from: />/g, to: '&gt;' },
      { from: /"/g, to: '&quot;' },
      { from: /'/g, to: '&#039;' },
    ];
    expect(htmlEscapeReplacements()).toEqual(expected);
  });

  test('escapeHtml applies all replacements', () => {
    const input = '&<>"\'';
    const expected = '&amp;&lt;&gt;&quot;&#039;';
    expect(escapeHtml(input)).toBe(expected);
  });
});
