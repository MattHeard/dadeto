import { describe, test, expect } from '@jest/globals';
import { wrapHtml, doctype } from '../../src/generator/html.js';

describe('wrapHtml DOCTYPE runtime', () => {
  test('prepends the standard DOCTYPE', () => {
    const result = wrapHtml('content');
    expect(result.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(result.startsWith(doctype())).toBe(true);
  });
});
