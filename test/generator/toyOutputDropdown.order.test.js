import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => `<html>${html}</html>`;

describe('toy output dropdown option order', () => {
  test('options appear in the expected order', () => {
    const blog = {
      posts: [
        {
          key: 'ORDER',
          title: 'Toy Post',
          publicationDate: '2024-01-01',
          toy: { modulePath: './toys/2024-01-01/example.js', functionName: 'example' }
        }
      ]
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<select class="output">([\s\S]*?)<\/select>/);
    expect(match).not.toBeNull();
    const options = match[1]
      .trim()
      .split(/\s*(?=<option)/)
      .filter(Boolean);
    const expected = [
      '<option value="text">text</option>',
      '<option value="pre">pre</option>',
      '<option value="tic-tac-toe">tic-tac-toe</option>',
      '<option value="battleship-solitaire-fleet">battleship-solitaire-fleet</option>',
      '<option value="battleship-solitaire-clues-presenter">battleship-solitaire-clues-presenter</option>'
    ];
    expect(options).toEqual(expected);
  });
});
