import { describe, test, expect } from '@jest/globals';
import { styles } from '../../src/generator/styles.js';

describe('styles constant', () => {
  test('contains expected CSS rules', () => {
    expect(styles).toContain('background-color: #121212;');
    expect(styles).toContain('.article-title');
  });
});
