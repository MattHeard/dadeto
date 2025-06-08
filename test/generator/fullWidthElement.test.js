import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';
import { fullWidthElement } from '../../src/generator/full-width.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = content => ['<html>', content, '</html>'].join('');

describe('fullWidthElement integration', () => {
  test('blog articles include the full width element', () => {
    const blog = {
      posts: [
        {
          key: 'FW1',
          title: 'Full Width Test',
          publicationDate: '2024-01-01',
          content: ['Paragraph'],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain(fullWidthElement);
  });

  test('blog articles include full width markup', () => {
    const blog = {
      posts: [
        {
          key: 'FW1',
          title: 'Full Width Test',
          publicationDate: '2024-01-01',
          content: ['Paragraph'],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<div class="key full-width">');
    expect(html).toContain('<div class="value full-width">');
  });

  test('fullWidthElement has expected structure', () => {
    expect(fullWidthElement).not.toHaveLength(0);
    expect(fullWidthElement).toContain('class="key full-width"');
    expect(fullWidthElement).toContain('class="value full-width"');
  });
});
