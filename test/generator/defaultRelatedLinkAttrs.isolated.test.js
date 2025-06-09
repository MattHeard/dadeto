import { describe, test, expect, jest } from '@jest/globals';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => c;

// This test isolates module loading to ensure the generator module
// is loaded fresh, allowing mutation testing to correctly instrument it.
describe('DEFAULT_RELATED_LINK_ATTRS isolated import', () => {
  test('includes target and rel attributes', async () => {
    await jest.isolateModulesAsync(async () => {
      const { generateBlog } = await import('../../src/generator/generator.js');
      const blog = {
        posts: [
          {
            key: 'ISO',
            title: 'Isolated',
            publicationDate: '2024-01-01',
            content: ['text'],
            relatedLinks: [
              { url: 'https://example.com', type: 'article', title: 'Example' },
            ],
          },
        ],
      };
      const html = generateBlog({ blog, header, footer }, wrapHtml);
      expect(html).toContain('target="_blank" rel="noopener"');
    });
  });
});
