import { describe, test, expect } from '@jest/globals';
import { generateBlog } from '../../src/build/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

describe('content renderers mapping', () => {
  test('generateBlog renders text and quote content', () => {
    const blog = {
      posts: [
        {
          key: 'CR1',
          title: 'Content',
          publicationDate: '2024-01-01',
          content: ['hello', { type: 'quote', content: 'q' }],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<p class="value">hello</p>');
    expect(html).toContain('<blockquote class="value">');
    expect(html).toContain('<p>q</p>');
  });

  test('generateBlog renders manual content as a collapsed block with an inline toggle after the title', () => {
    const blog = {
      posts: [
        {
          key: 'CR1',
          title: 'Content',
          publicationDate: '2024-01-01',
          content: [
            {
              type: 'manual',
              id: 'CR1-manual',
              title: 'User manual',
              content: ['line one', 'line two'],
            },
          ],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<div class="key">man</div>');
    expect(html).toContain('class="manual"');
    expect(html).toContain('User manual <span class="manual-toggle-menu">(');
    expect(html).toContain('class="manual-body"');
    expect(html).toContain('hidden');
    expect(html).toContain('data-manual-toggle');
    expect(html).not.toContain('href="#CR1-manual-body"');
    expect(html).not.toContain('href="#CR1-manual"');
    expect(html).not.toContain('data-manual-action="show"');
    expect(html).not.toContain('data-manual-action="hide"');
    expect(html).toContain('<p>line one</p><p>line two</p>');
  });

  test('generateBlog renders markdown manuals as collapsed preformatted text', () => {
    const blog = {
      posts: [
        {
          key: 'CR2',
          title: 'Content',
          publicationDate: '2024-01-01',
          content: [
            {
              type: 'manual',
              id: 'CR2-manual',
              title: 'User manual',
              markdown: '# Heading\n\n- item one\n- item two',
            },
          ],
        },
      ],
    };
    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('class="manual-body manual-markdown"');
    expect(html).toContain('# Heading');
    expect(html).toContain('- item one');
    expect(html).toContain('- item two');
  });
});
