import { describe, test, expect } from '@jest/globals';
import { wrapHtml, DOCTYPE } from '../../src/generator/html.js';

describe('wrapHtml DOCTYPE usage', () => {
  test('uses the exported DOCTYPE constant', () => {
    const html = wrapHtml('hi');
    expect(html.startsWith(DOCTYPE)).toBe(true);
  });
});
