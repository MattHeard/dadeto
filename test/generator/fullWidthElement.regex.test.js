import { describe, test, expect } from '@jest/globals';
import { fullWidthElement } from '../../src/generator/full-width.js';

// Ensure the exported constant includes the expected markup structure

describe('fullWidthElement structure', () => {
  test('contains full-width key and value divs', () => {
    const regex = /<div class="key full-width">[^<]*<\/div><div class="value full-width">[^<]*<\/div>/;
    expect(fullWidthElement()).toMatch(regex);
  });
});
