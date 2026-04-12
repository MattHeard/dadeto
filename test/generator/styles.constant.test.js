import { describe, test, expect } from '@jest/globals';
import { styles } from '../../src/build/styles.js';

describe('styles constant', () => {
  test('includes global input background color rule', () => {
    const css = styles();
    expect(typeof css).toBe('string');
    expect(css).toContain('input:not([type="file"]):not([type="checkbox"])');
    expect(css).toContain('textarea');
    expect(css).toContain('select');
    expect(css).toContain('background-color: #bbb');
    expect(css).toContain('line-height: inherit');
    expect(css).toContain('line-height: 1.5');
    expect(css).not.toContain('input[type="file"]');
    expect(css).not.toContain('input[type="checkbox"]');
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
