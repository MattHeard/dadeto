import {
  escapeHtml,
  buildAltsHtml,
} from '../../../../src/core/cloud/render-variant/render-variant-core.js';

describe('escapeHtml', () => {
  it('escapes the common HTML entities', () => {
    const raw = `&<>'"`;
    const escaped = escapeHtml(raw);

    expect(escaped).toBe('&amp;&lt;&gt;&#039;&quot;');
  });

  it('coerces nullish values to empty strings', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('buildAltsHtml', () => {
  it('renders list items with trimmed content previews', () => {
    const html = buildAltsHtml(42, [
      {
        name: 'a',
        content: 'one two three four five six seven',
      },
      {
        name: 'b',
        content: '<script>alert("x")</script>',
      },
      {
        name: 'c',
        content: undefined,
      },
    ]);

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<ol>');

    // Variant list items use five-word previews and escape HTML.
    expect(html).toContain(
      '<li><a href="/p/42a.html">one two three four five</a></li>'
    );
    expect(html).toContain(
      '<li><a href="/p/42b.html">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</a></li>'
    );
    // Missing content should produce an empty string.
    expect(html).toContain('<li><a href="/p/42c.html"></a></li>');
  });
});
