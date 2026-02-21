import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('TOY_UI_SECTIONS full HTML', () => {
  test('generateBlog includes full input section markup', () => {
    const blog = {
      posts: [
        {
          key: 'TUIFULL',
          title: 'Toy Section',
          publicationDate: '2024-01-01',
          content: ['x'],
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
    expect(html).toContain(inSection);
  });
});
