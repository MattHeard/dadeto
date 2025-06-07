import { describe, test, expect } from '@jest/globals';
import {
  DOCTYPE,
  LANGUAGE,
  HTML_TAG_NAME,
  ATTR_NAME,
  HTML_ESCAPE_REPLACEMENTS,
} from '../../src/generator/html.js';

describe('html constants', () => {
  test('DOCTYPE constant is correct', () => {
    expect(DOCTYPE).toBe('<!DOCTYPE html>');
  });

  test('LANGUAGE constants include EN', () => {
    expect(LANGUAGE).toEqual({ EN: 'en' });
    expect(Object.isFrozen(LANGUAGE)).toBe(false);
  });

  test('HTML_TAG_NAME constant is html', () => {
    expect(HTML_TAG_NAME).toBe('html');
  });

  test('ATTR_NAME constants', () => {
    expect(ATTR_NAME).toEqual({ LANG: 'lang', CLASS: 'class', ID: 'id' });
  });

  test('HTML_ESCAPE_REPLACEMENTS contains standard replacements', () => {
    const expected = [
      { from: /&/g, to: '&amp;' },
      { from: /</g, to: '&lt;' },
      { from: />/g, to: '&gt;' },
      { from: /"/g, to: '&quot;' },
      { from: /'/g, to: '&#039;' },
    ];
    expect(HTML_ESCAPE_REPLACEMENTS).toEqual(expected);
  });
});
