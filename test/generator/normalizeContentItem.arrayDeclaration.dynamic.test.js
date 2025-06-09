import { describe, test, expect } from '@jest/globals';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem array declaration dynamic import', () => {
  test('generateBlog handles primitive and object content', async () => {
    const { generateBlog } = await import('../../src/generator/generator.js');
    const blog = {
      posts: [
        {
          key: 'ARR2',
          title: 'Array Dynamic',
          publicationDate: '2024-07-05',
          content: ['text', 200, false, null, { type: 'quote', content: 'QQ' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">text</p>');
    expect(html).toContain('<p class="value">200</p>');
    expect(html).toContain('<p class="value">false</p>');
    expect(html).toContain('<p class="value">null</p>');
    expect(html).toContain('<blockquote class="value">');
  });
});
