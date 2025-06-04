import { describe, test, expect } from '@jest/globals';
import {
  createOpeningTag,
  createTag,
  escapeHtml,
} from '../../src/generator/html.js';

describe('html utilities', () => {
  test('createOpeningTag omits space when no attributes', () => {
    expect(createOpeningTag('div')).toBe('<div>');
  });

  test('createOpeningTag adds space when attributes are provided', () => {
    expect(createOpeningTag('div', 'class="c"')).toBe('<div class="c">');
  });

  test('createTag handles empty attributes', () => {
    expect(createTag('span', '', 'x')).toBe('<span>x</span>');
  });

  test('createTag includes attributes when provided', () => {
    expect(createTag('p', 'id="a"', 't')).toBe('<p id="a">t</p>');
  });

  test('escapeHtml replaces special characters', () => {
    expect(escapeHtml('<div>&"')).toBe('&lt;div&gt;&amp;&quot;');
  });
});
