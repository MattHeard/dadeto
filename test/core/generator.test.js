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
});
