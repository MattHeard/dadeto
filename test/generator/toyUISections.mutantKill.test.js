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
      '<option value="mobile-controls">mobile-controls</option><option value="mosslight-keypad">mosslight-keypad</option><option value="gamepad-capture">gamepad-capture</option>';
    const buttonSection =
      '<div class="key"></div><div class="value"><button type="button" class="toy-focus-toggle">Focus mode</button>' +
      '<button type="submit" disabled>Submit</button>' +
      '<label class="auto-submit-label"><input type="checkbox" class="auto-submit-checkbox" /> Auto</label></div>';
    expect(html).toContain(inSection);
    expect(html).toContain(buttonSection);
  });
});
