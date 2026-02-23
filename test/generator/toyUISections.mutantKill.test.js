import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('TOY_UI_SECTIONS exact markup', () => {
  test('generateBlog includes full input and button sections', () => {
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
    const inSection =
      '<div class="key">in</div><div class="value"><select class="input"><option value="text">text</option><option value="textarea">textarea</option><option value="number">number</option><option value="kv">kv</option><option value="blog-key">blog-key</option><option value="dendrite-story">dendrite-story</option><option value="dendrite-page">dendrite-page</option><option value="moderator-ratings">moderator-ratings</option></select><input type="text" disabled></div>';
    const buttonSection =
      '<div class="key"></div><div class="value"><button type="submit" disabled>Submit</button>' +
      '<label class="auto-submit-label"><input type="checkbox" class="auto-submit-checkbox" disabled /> Auto</label></div>';
    expect(html).toContain(inSection);
    expect(html).toContain(buttonSection);
  });
});
