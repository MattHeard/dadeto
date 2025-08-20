import { describe, test, expect } from '@jest/globals';
import { buildAltsHtml } from '../../infra/cloud-functions/render-variant/buildAltsHtml.js';

describe('buildAltsHtml', () => {
  test('links to variant pages in /p path', () => {
    const html = buildAltsHtml(1, [{ name: 'a', content: 'hello world' }]);
    expect(html).toContain('<a href="/p/1a.html">');
  });

  test('includes navigation header', () => {
    const html = buildAltsHtml(1, []);
    expect(html).toContain('<nav class="nav-inline"');
    expect(html).toContain('id="signinButton"');
  });
});
