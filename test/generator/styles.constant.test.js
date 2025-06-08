import { describe, test, expect } from '@jest/globals';
import { styles } from '../../src/generator/styles.js';

describe('styles constant', () => {
  test('includes body background color rule', () => {
    expect(typeof styles).toBe('string');
    expect(styles).toContain('background-color: #121212');
  });

  test('contains multiple CSS rules', () => {
    const ruleCount = (styles.match(/\{/g) || []).length;
    expect(ruleCount).toBeGreaterThan(5);
  });
});
