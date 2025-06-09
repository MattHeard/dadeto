import { describe, test, expect } from '@jest/globals';
import { HTML_ESCAPE_REPLACEMENTS, escapeHtml } from '../../src/generator/html.js';

describe('HTML_ESCAPE_REPLACEMENTS usage', () => {
  test('escapeHtml replaces all characters using replacements', () => {
    const input = '&<>"\'';
    const expected = '&amp;&lt;&gt;&quot;&#039;';
    expect(escapeHtml(input)).toBe(expected);
  });

  test('HTML_ESCAPE_REPLACEMENTS array has five entries', () => {
    expect(Array.isArray(HTML_ESCAPE_REPLACEMENTS)).toBe(true);
    expect(HTML_ESCAPE_REPLACEMENTS).toHaveLength(5);
  });
});
