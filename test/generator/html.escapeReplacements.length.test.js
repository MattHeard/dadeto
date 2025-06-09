import { describe, test, expect } from '@jest/globals';
import { HTML_ESCAPE_REPLACEMENTS } from '../../src/generator/html.js';

describe('HTML_ESCAPE_REPLACEMENTS length', () => {
  test('contains five standard replacements', () => {
    expect(Array.isArray(HTML_ESCAPE_REPLACEMENTS)).toBe(true);
    expect(HTML_ESCAPE_REPLACEMENTS).toHaveLength(5);
    const keys = HTML_ESCAPE_REPLACEMENTS.map(r => Object.keys(r).sort());
    keys.forEach(k => expect(k).toEqual(['from', 'to']));
  });
});
