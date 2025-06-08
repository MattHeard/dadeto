import { describe, test, expect } from '@jest/globals';
import { HTML_ESCAPE_REPLACEMENTS } from '../../src/generator/html.js';

function escapeWithReplacements(text, replacements) {
  return replacements.reduce((acc, { from, to }) => acc.replace(from, to), text);
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
    expect(HTML_ESCAPE_REPLACEMENTS).toEqual(expected);
  });

  test('replacements escape all special characters', () => {
    const input = '&<>"\'';
    const escaped = escapeWithReplacements(input, HTML_ESCAPE_REPLACEMENTS);
    expect(escaped).toBe('&amp;&lt;&gt;&quot;&#039;');
  });
});
