import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = content => `<html>${content}</html>`;

describe('toy UI sections mutant', () => {
  test('toy UI includes input, submit and output sections', () => {
    const blog = {
      posts: [
        {
          key: 'TUIS1',
          title: 'Toy UI Post',
          publicationDate: '2024-01-01',
          toy: {
            modulePath: './toys/2024-01-01/example.js',
            functionName: 'example',
          },
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<div class="key">in</div>');
    const buttonSection =
      '<div class="key"></div><div class="value"><button type="submit" disabled>Submit</button>' +
      '<label class="auto-submit-label"><input type="checkbox" class="auto-submit-checkbox" disabled /> Auto</label></div>';
    expect(html).toContain(buttonSection);
    expect(html).toContain('<div class="key">out</div>');
    expect(html).toContain('This toy requires Javascript to run.');
  });
});
