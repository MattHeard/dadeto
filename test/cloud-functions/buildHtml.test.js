import { describe, test, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { buildHtml } from '../../src/core/cloud/render-variant/render-variant-core.js';

describe('buildHtml', () => {
  test('sets default head title when story title missing', () => {
    const html = buildHtml(1, 'a', 'hello', []);
    expect(html).toContain('<title>Dendrite</title>');
  });

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

  test('includes story title in head title when provided', () => {
    const html = buildHtml(1, 'a', 'hello', [], 'My Story');
    expect(html).toContain('<title>Dendrite - My Story</title>');
  });

  test('omits heading when showTitleHeading is false', () => {
    const html = buildHtml(
      1,
      'a',
      'hello',
      [],
      'My Story',
      '',
      '',
      '',
      '',
      false
    );
    expect(html).toContain('<title>Dendrite - My Story</title>');
    expect(html).not.toContain('<h1>My Story</h1>');
  });

  test('links option without target page using slug', () => {
    const html = buildHtml(12, 'a', 'content', [
      { content: 'Go left', position: 0 },
    ]);
    expect(html).toContain(
      '<li><a class="variant-link" data-link-id="12-a-0" href="../new-page.html?option=12-a-0">Go left</a></li>'
    );
  });

  test('links option with target page to existing page', () => {
    const html = buildHtml(5, 'a', 'content', [
      {
        content: 'Go right',
        position: 1,
        targetPageNumber: 42,
        targetVariantName: 'b',
      },
    ]);
    expect(html).toContain(
      '<li><a class="variant-link" data-link-id="5-a-1" href="/p/42b.html">Go right</a></li>'
    );
  });

  test('includes data-variants when multiple target variants provided', () => {
    const html = buildHtml(5, 'a', 'content', [
      {
        content: 'Go elsewhere',
        position: 0,
        targetPageNumber: 10,
        targetVariantName: 'a',
        targetVariants: [
          { name: 'a', weight: 1 },
          { name: 'b', weight: 2 },
        ],
      },
    ]);
    expect(html).toContain(
      '<li><a class="variant-link" data-link-id="5-a-0" href="/p/10a.html" data-variants="10a:1,10b:2">Go elsewhere</a></li>'
    );
    expect(html).toContain('a.variant-link[data-variants]');
  });

  test('defaults target variant weight to 1 when missing', () => {
    const html = buildHtml(7, 'c', 'content', [
      {
        content: 'Stay here',
        position: 1,
        targetPageNumber: 99,
        targetVariants: [{ name: 'a' }, { name: 'b', weight: 3 }],
      },
    ]);
    expect(html).toContain(
      '<li><a class="variant-link" data-link-id="7-c-1" href="/p/99.html" data-variants="99a:1,99b:3">Stay here</a></li>'
    );
  });

  test('includes author below options when provided', () => {
    const html = buildHtml(3, 'a', 'content', [], '', 'Jane Doe');
    const optionsIndex = html.indexOf('</ol>');
    const authorIndex = html.indexOf('<p>By Jane Doe</p>');
    expect(authorIndex).toBeGreaterThan(optionsIndex);
  });

  test('links author name when author URL provided', () => {
    const html = buildHtml(3, 'a', 'content', [], '', 'Jane Doe', '/a/u1.html');
    expect(html).toContain('<p>By <a href="/a/u1.html">Jane Doe</a></p>');
  });

  test('links to other variants page', () => {
    const html = buildHtml(1, 'a', 'content', []);
    expect(html).toContain('<a href="./1-alts.html">Other variants</a>');
  });

  test('includes rewrite link with page parameter', () => {
    const html = buildHtml(2, 'b', 'content', []);
    expect(html).toContain(
      '<a href="../new-page.html?page=2">Rewrite</a> <a href="./2-alts.html">Other variants</a>'
    );
  });

  test('shows page number with navigation links', () => {
    const html = buildHtml(5, 'b', 'content', []);
    expect(html).toContain(
      '<p style="text-align:center"><a style="text-decoration:none" href="/p/4a.html">◀</a> 5 <a style="text-decoration:none" href="/p/6a.html">▶</a></p>'
    );
  });

  test('includes report link and script', () => {
    const html = buildHtml(1, 'a', 'content', []);
    expect(html).toContain('<a id="reportLink" href="#">⚑ Report</a>');
    expect(html).toContain("JSON.stringify({variant:'1a'})");
    expect(html).toContain('prod-report-for-moderation');
  });

  test('renders each line in separate paragraph', () => {
    const html = buildHtml(1, 'a', 'one\ntwo', []);
    expect(html).toContain('<p>one</p><p>two</p>');
  });

  test('renders markdown bold and italics', () => {
    const html = buildHtml(1, 'a', 'a *b* and **c**', []);
    expect(html).toContain('<p>a <em>b</em> and <strong>c</strong></p>');
  });

  test('renders markdown in option content', () => {
    const html = buildHtml(1, 'a', 'content', [
      { content: 'Go *left* and **bold**', position: 0 },
    ]);
    expect(html).toContain(
      '<li><a class="variant-link" data-link-id="1-a-0" href="../new-page.html?option=1-a-0">Go <em>left</em> and <strong>bold</strong></a></li>'
    );
  });

  test('includes parent and first page links when provided', () => {
    const html = buildHtml(
      2,
      'b',
      'content',
      [],
      '',
      '',
      '',
      '/p/1a.html',
      '/p/9a.html'
    );
    expect(html).toContain('<a href="/p/1a.html">Back</a>');
    expect(html).toContain('<a href="/p/9a.html">First page</a>');
  });

  test('includes navigation header and sign-in script', () => {
    const html = buildHtml(1, 'a', 'content', []);
    expect(html).toContain('<nav class="nav-inline"');
    expect(html).toContain('id="signinButton"');
    expect(html).toContain('import {');
    expect(html).toContain('initGoogleSignIn');
    expect(html).toContain('getIdToken');
    expect(html).toContain('isAdmin');
    expect(html).toContain("from '../googleAuth.js'");
  });

  test('includes favicon link', () => {
    const html = buildHtml(1, 'a', 'content', []);
    expect(html).toContain('<link rel="icon" href="/favicon.ico" />');
  });

  test('renders brand without leading whitespace', () => {
    const html = buildHtml(1, 'a', 'content', []);
    expect(html).toMatch(
      /<a class="brand" href="\/">\s*<img src="\/img\/logo.png" alt="Dendrite logo" \/>\s*Dendrite\s*<\/a>/
    );
  });

  test('rewrite link omits tracking query parameters', async () => {
    const html = buildHtml(5, 'a', 'content', [
      {
        content: 'Go elsewhere',
        position: 0,
        targetPageNumber: 10,
        targetVariantName: 'a',
        targetVariants: [
          { name: 'a', weight: 1 },
          { name: 'b', weight: 1 },
        ],
      },
    ]);
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'https://example.com',
    });
    await new Promise(resolve => {
      dom.window.document.addEventListener('DOMContentLoaded', resolve);
    });
    const link = dom.window.document.querySelector('a.variant-link');
    expect(link.href).toMatch(/^https:\/\/example\.com\/p\/10[ab]\.html$/);
    expect(link.search).toBe('');
  });
});
