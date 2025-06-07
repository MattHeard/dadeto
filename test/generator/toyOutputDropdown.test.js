import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = content => `<html>${content}</html>`;

describe('toy output dropdown', () => {
  test('generateBlog includes all output type options', () => {
    const blog = {
      posts: [
        {
          key: 'TOYO1',
          title: 'Toy Post',
          publicationDate: '2024-01-01',
          toy: { modulePath: './toys/2024-01-01/example.js', functionName: 'example' }
        }
      ]
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const options = [
      '<option value="text">text</option>',
      '<option value="pre">pre</option>',
      '<option value="tic-tac-toe">tic-tac-toe</option>',
      '<option value="battleship-solitaire-fleet">battleship-solitaire-fleet</option>',
      '<option value="battleship-solitaire-clues-presenter">battleship-solitaire-clues-presenter</option>'
    ];
    options.forEach(option => {
      expect(html).toContain(option);
    });
  });
});
