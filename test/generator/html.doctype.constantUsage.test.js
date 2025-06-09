import { describe, test, expect } from '@jest/globals';
import { wrapHtml, doctype } from '../../src/generator/html.js';

describe('wrapHtml DOCTYPE usage', () => {
  test('uses the exported DOCTYPE constant', () => {
    const html = wrapHtml('hi');
    expect(html.startsWith(doctype())).toBe(true);
  });
});
