import { describe, test, expect } from '@jest/globals';
import { htmlEscapeReplacements } from '../../src/generator/html.js';

/**
 * Escape a string using the provided replacements.
 *
 * @param {string} text input text to escape
 * @param {{from: RegExp, to: string}[]} replacements replacement pairs
 * @returns {string} escaped string
 */
function escapeWithReplacements(text, replacements) {
  return replacements.reduce(
    (acc, { from, to }) => acc.replace(from, to),
    text
  );
}

describe('HTML_ESCAPE_REPLACEMENTS integrity', () => {
  test('contains all standard replacements', () => {
    const expected = [
      { from: /&/g, to: '&amp;' },
      { from: /</g, to: '&lt;' },
      { from: />/g, to: '&gt;' },
      { from: /"/g, to: '&quot;' },
      { from: /'/g, to: '&#039;' },
    ];
    expect(htmlEscapeReplacements()).toEqual(expected);
  });

  test('replacements escape all special characters', () => {
    const input = '&<>"\'';
    const escaped = escapeWithReplacements(input, htmlEscapeReplacements());
    expect(escaped).toBe('&amp;&lt;&gt;&quot;&#039;');
  });
});
