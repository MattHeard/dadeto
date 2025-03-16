import { getHtmlFromMarkdown } from '../src/html';

describe('getHtmlFromMarkdown', () => {
  it('should convert *foo* to italics', () => {
    const markdown = '*foo*';
    const html = getHtmlFromMarkdown(markdown);
    expect(html).toBe('<em>*foo*</em>');
  });
});
