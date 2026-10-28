import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { renderHtmlTemplate } from '../../../src/core/cloud/html-template.js';

describe('renderHtmlTemplate', () => {
  it('loads a checked-in template and replaces named placeholders', () => {
    const template = readFileSync(
      resolve('src/core/cloud/render-author/author-page.html'),
      'utf8'
    );

    const html = renderHtmlTemplate(template, {
      authorName: 'Ada',
      moderatorReputation: 'Trusted',
      variants: '<article>Variant</article>',
    });

    expect(html).toContain('Ada');
    expect(html).toContain('Trusted');
    expect(html).toContain('<article>Variant</article>');
    expect(html).not.toContain('{{authorName}}');
  });
});

it('interpolates only named placeholders in caller-supplied text', () => {
  expect(
    renderHtmlTemplate('{{key}} {{key}} {{missing}} {{not-valid}}', {
      key: '$& <b>α</b>',
    })
  ).toBe('$& <b>α</b> $& <b>α</b> undefined {{not-valid}}');
  expect(renderHtmlTemplate('plain text', {})).toBe('plain text');
  expect(renderHtmlTemplate('', {})).toBe('');
});
