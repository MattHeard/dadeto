import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => `<html>${c}</html>`;

describe('TOY_UI_SECTIONS integration', () => {
  test('generateBlog includes input dropdown and submit button', () => {
    const blog = {
      posts: [
        {
          key: 'TOYUI',
          title: 'Toy Post',
          publicationDate: '2024-01-01',
          content: ['text'],
          toy: {
            modulePath: './toys/2024-01-01/example.js',
            functionName: 'example',
          },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<select class="input">');
    expect(html).toContain('<button type="submit" disabled>Submit</button>');
  });
});
