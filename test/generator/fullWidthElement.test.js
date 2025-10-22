import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';
import { fullWidthElement } from '../../src/build/full-width.js';

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
    expect(html).toContain(fullWidthElement());
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
    const html = fullWidthElement();
    expect(html).not.toHaveLength(0);
    expect(html).toContain('class="key full-width"');
    expect(html).toContain('class="value full-width"');
  });

  test('full width element appears at article start', () => {
    const blog = {
      posts: [
        {
          key: 'FW2',
          title: 'Another Test',
          publicationDate: '2024-02-02',
          content: ['Paragraph'],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const regex = /<article[^>]*><div class="key full-width">/;
    expect(html).toMatch(regex);
  });
});
