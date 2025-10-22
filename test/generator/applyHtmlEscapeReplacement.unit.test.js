import { describe, test, expect } from '@jest/globals';
import { applyHtmlEscapeReplacement } from '../../src/build/html.js';

describe('applyHtmlEscapeReplacement', () => {
  test('replaces all occurrences of the pattern', () => {
    const text = '5 > 3 && 2 < 4';
    const replacement = { from: />/g, to: '&gt;' };
    const result = applyHtmlEscapeReplacement(text, replacement);
    expect(result).toBe('5 &gt; 3 && 2 < 4');
  });

  test('handles multiple characters using different replacements', () => {
    const text = '"A" & <B>';
    const reps = [
      { from: /"/g, to: '&quot;' },
      { from: /</g, to: '&lt;' },
      { from: />/g, to: '&gt;' },
    ];
    const escaped = reps.reduce(
      (acc, r) => applyHtmlEscapeReplacement(acc, r),
      text
    );
    expect(escaped).toBe('&quot;A&quot; & &lt;B&gt;');
  });
});
