import { describe, test, expect } from '@jest/globals';
import { fullWidthElement } from '../../src/build/full-width.js';

describe('fullWidthElement block characters', () => {
  test('contains expected number of block characters', () => {
    const html = fullWidthElement();
    const count = (html.match(/▄/g) || []).length;
    expect(count).toBe(136);
  });

  test('key and value block counts are correct', () => {
    const html = fullWidthElement();
    const match = html.match(
      /<div class="key full-width">(.*?)<\/div><div class="value full-width">(.*?)<\/div>/
    );
    expect(match[1].length).toBe(10);
    expect(match[2].length).toBe(126);
  });
});
