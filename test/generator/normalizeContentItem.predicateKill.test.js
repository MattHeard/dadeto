import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('normalizeContentItem predicate kill', () => {
  test('generateBlog does not throw for primitive string content', () => {
    const blog = {
      posts: [
        {
          key: 'PKL',
          title: 'Predicate',
          publicationDate: '2024-07-07',
          content: ['a'],
        },
      ],
    };
    const call = () => generateBlog({ blog, header, footer }, wrapHtml);
    expect(call).not.toThrow();
    expect(call()).toContain('<p class="value">a</p>');
  });
});
