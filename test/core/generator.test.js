import { createGeneratorHandle } from '../../src/core/build/generator.js';

const handle = createGeneratorHandle();

describe('generator runtime handle', () => {
  it('applies option defaults without overwriting explicit values', () => {
    const args = { label: 'Key', valueHTML: '<span>value</span>' };
    expect(handle.defaultKeyExtraClasses(args)).toEqual({
      label: 'Key',
      valueHTML: '<span>value</span>',
      keyExtraClasses: '',
    });
    expect(handle.defaultKeyExtraClasses({ keyExtraClasses: 'extra' })).toEqual(
      {
        keyExtraClasses: 'extra',
      }
    );
  });

  it('generates complete wrapped blog output and preserves post order rules', () => {
    const html = handle.generateBlogOuter({
      posts: [
        {
          key: 'old',
          title: 'Older',
          publicationDate: '2024-01-01',
          content: ['first'],
        },
        {
          key: 'new',
          title: 'Newer',
          publicationDate: '2024-02-01',
          content: ['second'],
        },
      ],
    });

    expect(html).toContain('<html lang=');
    expect(html).toContain('<article');
    expect(html).toContain('Newer');
    expect(html).toContain('Older');
    expect(html.indexOf('Newer')).toBeLessThan(html.indexOf('Older'));
    expect(html).toContain('<p class="value">first</p>');
    expect(html).toContain('<p class="value">second</p>');
  });

  it('exposes method defaults and id handling', () => {
    expect(
      handle.getDefaultInputMethod({ toy: { defaultInputMethod: 'number' } })
    ).toBe('number');
    expect(handle.getDefaultInputMethod({})).toBe('text');
    expect(
      handle.getDefaultOutputMethod({ toy: { defaultOutputMethod: 'graph' } })
    ).toBe('graph');
    expect(handle.getDefaultOutputMethod({})).toBeUndefined();
    expect(handle.getSelectedMethod('')).toBe('');
    expect(handle.getSelectedMethod('text')).toBeUndefined();
    expect(handle.getSelectedMethod('number')).toBe('number');
    expect(handle.createIdAttributeIfNeeded({ key: 'post-key' })).toBe(
      ' id="post-key"'
    );
    expect(handle.createIdAttributeIfNeeded({})).toBe(' id=""');
  });

  it('returns independently usable generation arguments', () => {
    const args = handle.getBlogGenerationArgs();
    expect(args.header).toContain('<!-- Header -->');
    expect(args.footer).toContain('</body>');
    expect(args.wrapFunc('<main>content</main>')).toContain('<html lang=');
    expect(
      handle.generateBlog(
        { blog: { posts: [] }, header: 'H', footer: 'F' },
        value => value
      )
    ).toBe('HF');
  });

  it('renders media, quotes, links, beta releases, and toy controls together', () => {
    const html = handle.generateBlogOuter({
      posts: [
        {
          key: 'rich',
          title: 'Rich post',
          publicationDate: '2024-06-01',
          release: 'beta',
          content: [{ type: 'quote', content: 'Quoted text' }, 'plain text'],
          illustration: { fileType: 'png', altText: 'Illustration' },
          audio: { fileType: 'mp3' },
          youtube: { id: 'video-id', timestamp: 4, title: 'Video' },
          relatedLinks: [
            {
              url: 'https://example.com',
              title: 'Example',
              author: 'Author',
              source: 'Source',
              quote: 'A quote',
              type: 'article',
            },
          ],
          toy: {
            modulePath: './toys/example.js',
            functionName: 'example',
            defaultInputMethod: 'number',
            defaultOutputMethod: 'graph-2d',
          },
        },
      ],
    });

    expect(html).toContain('release-beta');
    expect(html).toContain('<article class="entry release-beta"');
    expect(html).toContain('<blockquote class="value">');
    expect(html).toContain('Quoted text');
    expect(html).toContain('<img');
    expect(html).toContain('<audio');
    expect(html).toContain('<iframe');
    expect(html).toContain('https://example.com');
    expect(html).toContain('A quote');
    expect(html).toContain('<option value="number" selected>');
    expect(html).toContain('<option value="graph-2d" selected>');
  });

  it('renders manual content with its dedicated key and escaped identifiers', () => {
    const html = handle.generateBlogOuter({
      posts: [
        {
          key: 'manual-post',
          title: 'Manual post',
          publicationDate: '2024-07-01',
          content: [
            {
              type: 'manual',
              id: 'setup&guide',
              title: 'Setup guide',
              content: ['Step one'],
            },
          ],
        },
      ],
    });

    expect(html).toContain('<div class="key">man</div>');
    expect(html).toContain('id="setup&amp;guide"');
    expect(html).toContain('Setup guide');
    expect(html).toContain('<p>Step one</p>');
    expect(html).toContain('getElementById("setup&guide")');
    expect(html).toContain('aria-controls="setup&amp;guide-body"');
    expect(html).toContain('aria-expanded="false">show</button>');
  });

  it('uses manual defaults and renders escaped markdown manuals', () => {
    const html = handle.generateBlog(
      {
        blog: {
          posts: [
            {
              key: 'manual-defaults',
              title: 'Manual defaults',
              content: [
                { type: 'manual', id: 42, title: '', markdown: '<step>' },
              ],
            },
          ],
        },
        header: '',
        footer: '',
      },
      content => content
    );

    expect(html).toContain('class="manual" id="manual"');
    expect(html).toContain('>User manual <');
    expect(html).toContain('<p class="manual-toggle">User manual <span');
    expect(html).not.toContain('<p class="manual-toggle"> <span');
    expect(html).toContain('manual-markdown');
    expect(html).toContain('&lt;step&gt;');
    expect(html).toContain('aria-controls="manual-body"');
  });

  it('omits empty related-link collections and falsy metadata', () => {
    const emptyLinksHtml = handle.generateBlog(
      {
        blog: {
          posts: [
            {
              key: 'empty-links',
              title: 'Empty links',
              publicationDate: '2024-07-02',
              content: ['text'],
              relatedLinks: [],
            },
          ],
        },
        header: '',
        footer: '',
      },
      content => content
    );
    expect(emptyLinksHtml).not.toContain('<div class="key">links</div>');

    const html = handle.generateBlog(
      {
        blog: {
          posts: [
            {
              key: 'falsy-link-fields',
              title: 'Falsy link fields',
              publicationDate: '2024-07-03',
              content: ['text'],
              relatedLinks: [
                {
                  url: 'https://example.com',
                  type: 'article',
                  title: '',
                  author: null,
                  source: false,
                  quote: 0,
                },
              ],
            },
          ],
        },
        header: '',
        footer: '',
      },
      content => content
    );

    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener">""</a>'
    );
    expect(html).not.toContain('null');
    expect(html).not.toContain('false');
  });
});
