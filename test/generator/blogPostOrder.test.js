import { generateBlogOuter } from '../../src/build/generator.js';

describe('blog post order', () => {
  it('renders newer posts before older posts', () => {
    const html = generateBlogOuter({
      posts: [
        {
          key: 'older',
          title: 'Older post',
          publicationDate: '2024-01-01',
          content: [],
        },
        {
          key: 'newer',
          title: 'Newer post',
          publicationDate: '2024-01-02',
          content: [],
        },
      ],
    });

    expect(html.indexOf('Newer post')).toBeLessThan(html.indexOf('Older post'));
  });
});
