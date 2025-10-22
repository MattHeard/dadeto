import { test, expect, jest } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

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

test('generateBlog uses numeric day, short month, and numeric year', () => {
  const blog = {
    posts: [
      {
        key: 'DATE3',
        title: 'Format Options',
        publicationDate: '2022-01-02',
        content: ['Example'],
      },
    ],
  };
  const spy = jest.spyOn(Date.prototype, 'toLocaleDateString');
  generateBlog({ blog, header, footer }, wrapHtml);
  expect(spy).toHaveBeenCalledWith(
    'en-GB',
    expect.objectContaining({
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );
  spy.mockRestore();
});

test('generateBlog passes the exact date format options', () => {
  const blog = {
    posts: [
      {
        key: 'DATE4',
        title: 'Exact Options',
        publicationDate: '2022-06-15',
        content: ['Example'],
      },
    ],
  };
  const spy = jest.spyOn(Date.prototype, 'toLocaleDateString');
  generateBlog({ blog, header, footer }, wrapHtml);
  expect(spy).toHaveBeenCalledTimes(1);
  const [, options] = spy.mock.calls[0];
  expect(options).toEqual({
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  spy.mockRestore();
});
