import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';
import { fullWidthElement } from '../../src/generator/full-width.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('fullWidthElement placement', () => {
  test('article output includes fullWidthElement at start', () => {
    const blog = {
      posts: [
        { key: 'FWX', title: 'Test', publicationDate: '2024-01-01', content: ['x'] },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain(`<article class=\"entry\" id=\"FWX\">${fullWidthElement()}`);
  });

  test('fullWidthElement constant length is unchanged', () => {
    expect(fullWidthElement()).toHaveLength(206);
  });
});
