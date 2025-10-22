import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('getContentNormalizer mutant kill', () => {
  test('renders primitive content types correctly', () => {
    const blog = {
      posts: [
        {
          key: 'GN',
          title: 'Normalizer',
          publicationDate: '2024-01-01',
          content: ['str', 1, true, null],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">str</p>');
    expect(html).toContain('<p class="value">1</p>');
    expect(html).toContain('<p class="value">true</p>');
    expect(html).toContain('<p class="value">null</p>');
  });
});
