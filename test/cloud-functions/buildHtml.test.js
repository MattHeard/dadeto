import { describe, test, expect } from '@jest/globals';
import { buildHtml } from '../../infra/cloud-functions/render-variant/buildHtml.js';

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
      {
        content: 'Go right',
        position: 1,
        targetPageNumber: 42,
        targetVariantName: 'b',
      },
    ]);
    expect(html).toContain('<li><a href="/p/42b.html">Go right</a></li>');
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

  test('includes rewrite link when incoming option slug provided', () => {
    const html = buildHtml(2, 'b', 'content', [], '', '', '', '', '1-a-0');
    expect(html).toContain(
      '<a href="../new-page.html?option=1-a-0">Rewrite</a> <a href="./2-alts.html">Other variants</a>'
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
      '<li><a href="../new-page.html?option=1-a-0">Go <em>left</em> and <strong>bold</strong></a></li>'
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
      '/p/1a.html',
      '/p/9a.html'
    );
    expect(html).toContain('<a href="/p/1a.html">Back</a>');
    expect(html).toContain('<a href="/p/9a.html">First page</a>');
  });

  test('includes navigation header and sign-in script', () => {
    const html = buildHtml(1, 'a', 'content', []);
    expect(html).toContain('<nav class="nav">');
    expect(html).toContain('id="signinButton"');
    expect(html).toContain(
      "import { initGoogleSignIn } from '../googleAuth.js'"
    );
  });

  test('renders site title without leading whitespace', () => {
    const html = buildHtml(1, 'a', 'content', []);
    expect(html).toContain('<a href="/" class="site-title">');
    expect(html).toContain(
      '<img src="/img/logo.png" alt="Dendrite logo" /><span>Dendrite</span>'
    );
    expect(html).not.toContain('alt="Dendrite logo" /> Dendrite');
  });
});
