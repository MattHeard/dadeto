import { getHtmlFromMarkdown } from '../src/html';

describe('getHtmlFromMarkdown', () => {
  it('should convert *foo* to bold', () => {
    const markdown = '*foo*';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('<strong>foo</strong>');
  });

  it('should convert **foo** to bold', () => {
    const markdown = '**foo**';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('<strong>foo</strong>');
  });

  it('should convert _foo_ to italics', () => {
    const markdown = '_foo_';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('<em>foo</em>');
  });

  it('should convert `foo` to inline code', () => {
    const markdown = '`foo`';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('<code>foo</code>');
  });

  it('should convert code with special characters', () => {
    const markdown = '`<div>foo</div>`';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('<code>&lt;div&gt;foo&lt;/div&gt;</code>');
  });

  it('should handle multiple inline code blocks', () => {
    const markdown = 'Use `const` for constants and `let` for variables';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('Use <code>const</code> for constants and <code>let</code> for variables');
  });

  it('should convert ~~foo~~ to strikethrough', () => {
    const markdown = '~~foo~~';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('<del>foo</del>');
  });

  it('should handle strikethrough with other formatting', () => {
    const markdown = '~~**bold** and _italic_~~';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('<del><strong>bold</strong> and <em>italic</em></del>');
  });
});
