import { describe, test, expect } from '@jest/globals';
import { fullWidthElement } from '../../src/build/full-width.js';

describe('fullWidthElement boundaries', () => {
  test('starts and ends with expected tags', () => {
    const html = fullWidthElement();
    expect(html.startsWith('<div class="key full-width">')).toBe(true);
    expect(html.endsWith('</div>')).toBe(true);
  });
});
