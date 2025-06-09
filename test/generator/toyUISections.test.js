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

  test('output dropdown contains all default options', () => {
    const blog = {
      posts: [
        {
          key: 'TOYOPTS',
          title: 'Toy Options',
          publicationDate: '2024-01-02',
          content: ['text'],
          toy: {
            modulePath: './toys/2024-01-01/example.js',
            functionName: 'example',
          },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<select class="output">(.*?)<\/select>/);
    expect(match).not.toBeNull();
    const select = match[1];
    const expected = [
      'text',
      'pre',
      'tic-tac-toe',
      'battleship-solitaire-fleet',
      'battleship-solitaire-clues-presenter',
    ];
    expected.forEach(opt => {
      expect(select).toContain(`<option value="${opt}">${opt}</option>`);
    });
    const options = select.match(/<option[^>]*>.*?<\/option>/g) || [];
    expect(options).toHaveLength(expected.length);
  });
});
