import { describe, test, expect } from '@jest/globals';
import { styles } from '../../src/generator/styles.js';

describe('styles constant', () => {
  test('includes body background color rule', () => {
    const css = styles();
    expect(typeof css).toBe('string');
    expect(css).toContain('background-color: #121212');
  });

  test('contains multiple CSS rules', () => {
    const css = styles();
    const ruleCount = (css.match(/\{/g) || []).length;
    expect(ruleCount).toBeGreaterThan(5);
  });

  test('includes rule to hide beta posts', () => {
    const css = styles();
    expect(css).toMatch(/\.release-beta\s*{\s*display: none;\s*}/);
  });
});
