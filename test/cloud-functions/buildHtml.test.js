import { describe, test, expect } from '@jest/globals';
import { buildHtml } from '../../infra/cloud-functions/render-variant/buildHtml.js';

describe('buildHtml', () => {
  test('omits story title when not provided', () => {
    const html = buildHtml(1, 'a', 'hello', []);
    expect(html).not.toContain('<h1>My Story</h1>');
  });

  test('includes story title before content when provided', () => {
    const html = buildHtml(1, 'a', 'hello', [], 'My Story');
    const titleIndex = html.indexOf('<h1>My Story</h1>');
    const contentIndex = html.indexOf('<p>hello</p>');
    expect(titleIndex).toBeGreaterThan(-1);
    expect(titleIndex).toBeLessThan(contentIndex);
  });

  test('links option without target page using slug', () => {
    const html = buildHtml(12, 'a', 'content', [
      { content: 'Go left', position: 0 },
    ]);
    expect(html).toContain(
      '<li><a href="../new-page.html?option=12-a-0">Go left</a></li>'
    );
  });

  test('links option with target page to existing page', () => {
    const html = buildHtml(5, 'a', 'content', [
      { content: 'Go right', position: 1, targetPageNumber: 42 },
    ]);
    expect(html).toContain('<li><a href="/p/42a.html">Go right</a></li>');
  });

  test('includes author below options when provided', () => {
    const html = buildHtml(3, 'a', 'content', [], '', 'Jane Doe');
    const optionsIndex = html.indexOf('</ol>');
    const authorIndex = html.indexOf('<p>By Jane Doe</p>');
    expect(authorIndex).toBeGreaterThan(optionsIndex);
  });

  test('links to other variants page', () => {
    const html = buildHtml(1, 'a', 'content', []);
    expect(html).toContain('<a href="./1-alts.html">Other variants</a>');
  });
});
