import { test, expect, jest } from '@jest/globals';
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

test('generateBlog formats dates using en-GB locale', () => {
  const blog = {
    posts: [
      {
        key: 'DATE2',
        title: 'Another Post',
        publicationDate: '2022-12-25',
        content: ['Example'],
      },
    ],
  };
  const spy = jest.spyOn(Date.prototype, 'toLocaleDateString');
  generateBlog({ blog, header, footer }, wrapHtml);
  expect(spy).toHaveBeenCalledWith('en-GB', expect.any(Object));
  spy.mockRestore();
});
