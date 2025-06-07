import { test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => `<html>${html}</html>`;

test('generateBlog formats publication dates with year included', () => {
  const blog = {
    posts: [
      {
        key: 'DATE1',
        title: 'Dated Post',
        publicationDate: '2022-05-04',
        content: ['Example'],
      },
    ],
  };

  const html = generateBlog({ blog, header, footer }, wrapHtml);
  expect(html).toContain('4 May 2022');
});
