import { describe, test, expect } from '@jest/globals';
import { createOpeningTag, createTag } from '../../src/generator/html.js';

describe('html utilities', () => {
  test('createOpeningTag omits space when no attributes', () => {
    expect(createOpeningTag('div', '')).toBe('<div>');
  });

  test('createTag handles empty attributes', () => {
    expect(createTag('span', '', 'x')).toBe('<span>x</span>');
  });
});
