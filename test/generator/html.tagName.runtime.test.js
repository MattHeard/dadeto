import { describe, test, expect } from '@jest/globals';
import { wrapHtml } from '../../src/generator/html.js';

describe('HTML_TAG_NAME usage', () => {
  test('wrapHtml wraps content in html tag', () => {
    const result = wrapHtml('body');
    expect(result).toContain('<html lang="en">body</html>');
  });
});
