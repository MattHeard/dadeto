import { describe, test, expect } from '@jest/globals';
import { buildHtml } from '../../infra/cloud-functions/render-variant/buildHtml.js';

describe('buildHtml', () => {
  test('omits story title when not provided', () => {
    const html = buildHtml(1, 'hello', []);
    expect(html).not.toContain('<h1>My Story</h1>');
  });

  test('includes story title before content when provided', () => {
    const html = buildHtml(1, 'hello', [], 'My Story');
    const titleIndex = html.indexOf('<h1>My Story</h1>');
    const contentIndex = html.indexOf('<p>hello</p>');
    expect(titleIndex).toBeGreaterThan(-1);
    expect(titleIndex).toBeLessThan(contentIndex);
  });
});
