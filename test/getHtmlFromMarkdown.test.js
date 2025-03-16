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
});
