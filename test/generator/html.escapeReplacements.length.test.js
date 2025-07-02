import { describe, test, expect } from '@jest/globals';
import { htmlEscapeReplacements } from '../../src/generator/html.js';

const compareStrings = (a, b) => a.localeCompare(b);

describe('HTML_ESCAPE_REPLACEMENTS length', () => {
  test('contains five standard replacements', () => {
    const reps = htmlEscapeReplacements();
    expect(Array.isArray(reps)).toBe(true);
    expect(reps).toHaveLength(5);
    const keys = reps.map(r => Object.keys(r).sort(compareStrings));
    keys.forEach(k => expect(k).toEqual(['from', 'to']));
  });
});
