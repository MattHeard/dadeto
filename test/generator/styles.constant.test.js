import { describe, test, expect } from '@jest/globals';
import { styles } from '../../src/build/styles.js';

describe('styles constant', () => {
  test('includes global input background color rule', () => {
    const css = styles();
    expect(typeof css).toBe('string');
    expect(css).toContain('input {');
    expect(css).toContain('background-color: #bbb');
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
