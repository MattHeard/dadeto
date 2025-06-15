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

  test('generateBlog selects configured default input method', () => {
    const blog = {
      posts: [
        {
          key: 'SELDEF',
          title: 'Select Default',
          publicationDate: '2024-01-02',
          content: ['x'],
          toy: {
            modulePath: './toys/2024-01-02/example.js',
            functionName: 'example',
            defaultInputMethod: 'number',
          },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<option value="number" selected>number</option>');
  });

  test('generateBlog defaults to text input method', () => {
    const blog = {
      posts: [
        {
          key: 'NODEFAULT',
          title: 'No Default',
          publicationDate: '2024-01-03',
          content: ['x'],
          toy: {
            modulePath: './toys/2024-01-03/example.js',
            functionName: 'example',
          },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<select class="input">');
    expect(html).toContain('<option value="text">text</option>');
    expect(html).not.toContain('selected');
  });

  test('generateBlog input dropdown includes all input method options', () => {
    const blog = {
      posts: [
        {
          key: 'ALLINPUTS',
          title: 'All Inputs',
          publicationDate: '2025-01-01',
          content: ['text'],
          toy: {
            modulePath: './toys/2024-01-01/example.js',
            functionName: 'example',
          },
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const match = html.match(/<select class="input">([\s\S]*?)<\/select>/);
    expect(match).not.toBeNull();
    const dropdown = match[1];
    const expectedOptions = ['text', 'number', 'kv', 'dendrite-story'];
    for (const value of expectedOptions) {
      expect(dropdown).toContain(`<option value="${value}">${value}</option>`);
    }
  });
});
