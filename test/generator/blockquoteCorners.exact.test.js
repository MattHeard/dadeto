import { describe, test, expect } from '@jest/globals';
import { generateBlogOuter } from '../../src/build/generator.js';

// New test to ensure the BLOCKQUOTE_CORNERS constant remains intact.
describe('BLOCKQUOTE_CORNERS exact output', () => {
  test('generateBlogOuter inserts the full BLOCKQUOTE_CORNERS HTML', () => {
    const blog = {
      posts: [
        {
          key: 'BQEX',
          title: 'Exact Corners',
          publicationDate: '2024-06-07',
          content: [{ type: 'quote', content: 'Exact' }],
        },
      ],
    };
    const html = generateBlogOuter(blog);
    const corners =
      '<div class="corner corner-tl"><div class="h-line"></div><div class="v-line"></div></div>' +
      '<div class="corner corner-tr"><div class="h-line"></div><div class="v-line"></div></div>' +
      '<div class="corner corner-bl"><div class="h-line"></div><div class="v-line"></div></div>' +
      '<div class="corner corner-br"><div class="h-line"></div><div class="v-line"></div></div>';
    expect(html).toContain(corners);
  });
});
