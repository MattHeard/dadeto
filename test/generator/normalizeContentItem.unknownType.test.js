import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem unknown type', () => {
  test('generateBlog throws on unrecognized content type', () => {
    const blog = {
      posts: [
        {
          key: 'UNK1',
          title: 'Unknown Content',
          publicationDate: '2025-01-01',
          content: [{ type: 'unknown', content: 'oops' }],
        },
      ],
    };
    const call = () => generateBlog({ blog, header, footer }, wrapHtml);
    expect(call).toThrow('renderer is not a function');
  });
});
