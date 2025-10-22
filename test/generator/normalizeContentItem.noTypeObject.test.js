import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem object without type', () => {
  test('generateBlog throws when content object lacks type', () => {
    const blog = {
      posts: [
        {
          key: 'NT1',
          title: 'No Type',
          publicationDate: '2025-02-02',
          content: [{ content: 'missing type' }],
        },
      ],
    };
    const call = () => generateBlog({ blog, header, footer }, wrapHtml);
    expect(call).toThrow('renderer is not a function');
  });
});
