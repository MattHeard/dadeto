import { describe, test, expect } from '@jest/globals';
import { styles } from '../../src/build/styles.js';

describe('styles constant', () => {
  test('includes TUI-styled form controls', () => {
    const css = styles();
    expect(typeof css).toBe('string');
    expect(css).toContain('input:not([type="file"]):not([type="checkbox"])');
    expect(css).toContain('textarea');
    expect(css).toContain('select');
    expect(css).toContain('background-color: var(--terminal-panel)');
    expect(css).toContain('line-height: var(--cell-h)');
    expect(css).toContain('select.input');
    expect(css).toContain('select.output');
    expect(css).not.toContain('input[type="file"]');
    expect(css).toContain('input[type="checkbox"]');
    expect(css).toContain('accent-color: var(--terminal-accent)');
  });

  test('defines character-grid terminal sizing and media containment', () => {
    const css = styles();
    expect(css).toContain('--cell-w: 9.64px');
    expect(css).toContain('--cell-h: 18px');
    expect(css).toContain(
      'width: min(100%, calc(var(--cols) * var(--cell-w)))'
    );
    expect(css).toContain('.value:has(> img)');
    expect(css).toContain('p.value:has(> iframe)');
    expect(css).toContain('max-width: min(100%, calc(48 * var(--cell-w)))');
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
