import { describe, it, expect } from '@jest/globals';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => `<html>${c}</html>`;

describe('toy output dropdown mutant killer', () => {
  it('renders dropdown with expected options using dynamic import', async () => {
    const { generateBlog } = await import(
      '../../src/generator/generator.js?' + Date.now()
    );
    const blog = {
      posts: [
        {
          key: 'TOMK1',
          title: 'Toy Post',
          publicationDate: '2024-01-01',
          toy: { modulePath: './toys/2024-01-01/example.js', functionName: 'example' },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expected =
      '<select class="output"><option value="text">text</option><option value="pre">pre</option><option value="tic-tac-toe">tic-tac-toe</option><option value="battleship-solitaire-fleet">battleship-solitaire-fleet</option><option value="battleship-solitaire-clues-presenter">battleship-solitaire-clues-presenter</option></select>';
    expect(html).toContain(expected);
  });
});
