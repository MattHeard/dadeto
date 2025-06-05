import { beforeAll, describe, test, expect } from '@jest/globals';

let generateBlogOuter;

beforeAll(async () => {
  ({ generateBlogOuter } = await import('../../src/generator/generator.js'));
});

describe('normalizeContentItem with null content', () => {
  test('generateBlogOuter handles null in post content array', () => {
    const blog = {
      posts: [
        {
          key: 'NULL',
          title: 'Null Post',
          publicationDate: '2024-06-01',
          content: [null],
        },
      ],
    };
    const html = generateBlogOuter(blog);
    expect(html).toContain('<p class="value">null</p>');
  });
});
