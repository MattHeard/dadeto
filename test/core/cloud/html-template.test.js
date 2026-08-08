import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderHtmlTemplate } from '../../../src/core/cloud/html-template.js';

describe('renderHtmlTemplate', () => {
  it('loads a checked-in template and replaces named placeholders', () => {
    const templateUrl = pathToFileURL(
      resolve('src/core/cloud/render-author/author-page.html')
    );

    const html = renderHtmlTemplate(templateUrl, {
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
