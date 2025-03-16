import { getHtmlFromMarkdown } from '../src/html';

describe('getHtmlFromMarkdown', () => {
  it('should convert markdown to HTML', () => {
    const markdown = '# Hello, World!';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('<h1>Hello, World!</h1>');
  });
});
