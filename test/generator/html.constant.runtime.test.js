import { describe, test, expect } from '@jest/globals';

// Dynamically import within the test to ensure coverage of constant initialization

describe('HTML_TAG_NAME runtime constant', () => {
  test('HTML_TAG_NAME is html and used by createHtmlTag', async () => {
    const { HTML_TAG_NAME, createHtmlTag } = await import('../../src/generator/html.js');
    expect(HTML_TAG_NAME).toBe('html');
    expect(createHtmlTag('hi')).toBe('<html lang="en">hi</html>');
  });
});
