import { describe, test, expect } from '@jest/globals';
import {
  applyAllHtmlEscapeReplacements,
  HTML_ESCAPE_REPLACEMENTS,
} from '../../src/generator/html.js';

describe('applyAllHtmlEscapeReplacements', () => {
  test('escapes all HTML special characters', () => {
    const input = '<div>"O\'Reilly" & others</div>';
    const result = applyAllHtmlEscapeReplacements(
      input,
      HTML_ESCAPE_REPLACEMENTS
    );
    expect(result).toBe(
      '&lt;div&gt;&quot;O&#039;Reilly&quot; &amp; others&lt;/div&gt;'
    );
  });
});
