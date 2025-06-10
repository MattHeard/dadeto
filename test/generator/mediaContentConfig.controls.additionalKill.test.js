import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = html => html;

describe('MEDIA_CONTENT_CONFIG audio controls additional kill', () => {
  test('audio tags always include controls attribute', () => {
    const blog = {
      posts: [
        {
          key: 'AC1',
          title: 'Audio One',
          publicationDate: '2024-07-01',
          audio: { fileType: 'mp3' },
        },
        {
          key: 'TXT',
          title: 'Just Text',
          publicationDate: '2024-07-02',
          content: ['text'],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const audioMatch = html.match(/<audio[^>]*>/);
    expect(audioMatch).not.toBeNull();
    expect(audioMatch[0]).toContain('controls');
  });
});
