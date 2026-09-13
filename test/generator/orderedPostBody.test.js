import { generateBlogOuter } from '../../src/build/generator.js';

const basePost = content => ({
  key: 'ORDER',
  title: 'Ordered body',
  publicationDate: '2026-09-13',
  content,
});

describe('ordered post body', () => {
  test('renders typed entries in authored order and supports repeated types', () => {
    const html = generateBlogOuter({
      posts: [
        basePost([
          { type: 'text', content: 'first' },
          {
            type: 'illustration',
            content: { fileName: 'a', fileType: 'png', altText: 'A' },
          },
          { type: 'text', content: 'second' },
          {
            type: 'illustration',
            content: { fileName: 'b', fileType: 'png', altText: 'B' },
          },
        ]),
      ],
    });

    expect(html.indexOf('>first</p>')).toBeLessThan(
      html.indexOf('src="a.png"')
    );
    expect(html.indexOf('src="a.png"')).toBeLessThan(
      html.indexOf('>second</p>')
    );
    expect(html.indexOf('>second</p>')).toBeLessThan(
      html.indexOf('src="b.png"')
    );
  });

  test('places the configured toy at a marker and only once', () => {
    const html = generateBlogOuter({
      posts: [
        {
          ...basePost([
            { type: 'text', content: 'before' },
            { type: 'toy' },
            { type: 'text', content: 'after' },
          ]),
          toy: { modulePath: '/toy.js', functionName: 'toy' },
        },
      ],
    });

    expect(html.indexOf('>before</p>')).toBeLessThan(
      html.indexOf('class="toy-focus-toggle"')
    );
    expect(html.indexOf('class="toy-focus-toggle"')).toBeLessThan(
      html.indexOf('>after</p>')
    );
    expect(html.match(/class="toy-focus-toggle"/g)).toHaveLength(1);
    expect(html.match(/window\.addComponent\('ORDER'/g)).toHaveLength(1);
  });

  test('keeps the legacy toy fallback before related links', () => {
    const html = generateBlogOuter({
      posts: [
        {
          ...basePost(['content']),
          toy: { modulePath: '/toy.js', functionName: 'toy' },
          relatedLinks: [
            { url: 'https://example.com', title: 'link', type: 'article' },
          ],
        },
      ],
    });

    expect(html.indexOf('>content</p>')).toBeLessThan(
      html.indexOf('class="toy-focus-toggle"')
    );
    expect(html.indexOf('class="toy-focus-toggle"')).toBeLessThan(
      html.indexOf('class="related-links"')
    );
  });

  test('renders ordered audio and video entries', () => {
    const html = generateBlogOuter({
      posts: [
        basePost([
          { type: 'audio', content: { fileType: 'mp3' } },
          {
            type: 'video',
            content: { id: 'video-id', timestamp: 3, title: 'Video' },
          },
        ]),
      ],
    });
    expect(html).toContain('<audio');
    expect(html).toContain('video-id');
  });

  test('rejects malformed ordered body shapes', () => {
    expect(() =>
      generateBlogOuter({ posts: [{ ...basePost('not-an-array') }] })
    ).toThrow('Post content must be an array');
    expect(() =>
      generateBlogOuter({ posts: [basePost([{ type: 'links', content: [] }])] })
    ).toThrow('Links body entry must contain a non-empty array');
  });

  test.each([
    [
      'two toy markers',
      [{ type: 'toy' }, { type: 'toy' }],
      undefined,
      'at most one toy marker',
    ],
    [
      'marker without toy',
      [{ type: 'toy' }],
      undefined,
      'requires a configured post toy',
    ],
  ])('%s is rejected', (_name, content, toy, message) => {
    expect(() =>
      generateBlogOuter({ posts: [{ ...basePost(content), toy }] })
    ).toThrow(message);
  });
});
