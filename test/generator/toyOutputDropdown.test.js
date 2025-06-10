import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = content => `<html>${content}</html>`;

const blog = {
  posts: [
    {
      key: 'TOY',
      title: 'Toy Post',
      publicationDate: '2024-01-01',
      toy: { modulePath: './toys/2024-01-01/example.js', functionName: 'example' },
    },
  ],
};

const OPTIONS = [
  '<option value="text">text</option>',
  '<option value="pre">pre</option>',
  '<option value="tic-tac-toe">tic-tac-toe</option>',
  '<option value="battleship-solitaire-fleet">battleship-solitaire-fleet</option>',
  '<option value="battleship-solitaire-clues-presenter">battleship-solitaire-clues-presenter</option>',
];

describe('toy output dropdown', () => {
  test('includes all output type options', () => {
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    OPTIONS.forEach(option => {
      expect(html).toContain(option);
    });
  });

  test('contains expected number of options', () => {
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<select class="output">([\s\S]*?)<\/select>/);
    expect(match).not.toBeNull();
    const optionCount = (match[1].match(/<option/g) || []).length;
    expect(optionCount).toBe(OPTIONS.length);
  });

  test('options appear in fixed order', () => {
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<select class="output">([\s\S]*?)<\/select>/);
    expect(match).not.toBeNull();
    const options = match[1].replace(/\n/g, '').trim();
    expect(options).toBe(OPTIONS.join(''));
  });

  test('renders dropdown with expected markup', () => {
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expected = `<select class="output">${OPTIONS.join('')}</select>`;
    expect(html).toContain(expected);
  });
});
