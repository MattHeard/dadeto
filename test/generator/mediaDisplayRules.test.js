import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('MEDIA_DISPLAY_RULES integration', () => {
  test('generateBlog omits media sections when post has none', () => {
    const blog = { posts: [{ key: 'NONE1', title: 'No Media', publicationDate: '2024-06-01' }] };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<audio');
    expect(html).not.toContain('<iframe');
  });
});
