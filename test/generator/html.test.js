import { describe, test, expect } from '@jest/globals';
import { createOpeningTag, createTag } from '../../src/generator/html.js';

describe('html utilities', () => {
  test('createOpeningTag omits space when no attributes', () => {
    expect(createOpeningTag('div', '')).toBe('<div>');
  });

  test('createOpeningTag uses default attributes when omitted', () => {
    expect(createOpeningTag('p')).toBe('<p>');
  });

  test('createTag handles empty attributes', () => {
    expect(createTag('span', '', 'x')).toBe('<span>x</span>');
  });

  test('createOpeningTag adds space when attributes present', () => {
    expect(createOpeningTag('div', 'class="c"')).toBe('<div class="c">');
  });

  test('createTag handles non-empty attributes', () => {
    expect(createTag('span', 'class="y"', 'x')).toBe(
      '<span class="y">x</span>'
    );
  });
});
