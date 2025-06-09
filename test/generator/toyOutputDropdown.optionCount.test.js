import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => `<html>${c}</html>`;

describe('toy output dropdown option count', () => {
  test('output dropdown contains expected number of options', () => {
    const blog = {
      posts: [
        {
          key: 'COUNT',
          title: 'Count',
          publicationDate: '2024-01-01',
          toy: { modulePath: './toys/2024-01-01/example.js', functionName: 'example' }
        }
      ]
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<select class="output">([\s\S]*?)<\/select>/);
    expect(match).not.toBeNull();
    const optionCount = (match[1].match(/<option/g) || []).length;
    expect(optionCount).toBe(5);
  });
});
