import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem predicate kill', () => {
  test('generateBlog handles primitive content types without throwing', () => {
    const blog = {
      posts: [
        {
          key: 'PRIM',
          title: 'Primitives',
          publicationDate: '2024-01-01',
          content: ['a', 1, true, null],
        },
      ],
    };
    const call = () => generateBlog({ blog, header, footer }, wrapHtml);
    expect(call).not.toThrow();
    const html = call();
    expect(html).toContain('<p class="value">a</p>');
    expect(html).toContain('<p class="value">1</p>');
    expect(html).toContain('<p class="value">true</p>');
    expect(html).toContain('<p class="value">null</p>');
  });
});
