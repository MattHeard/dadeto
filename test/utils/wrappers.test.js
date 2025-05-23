import { describe, test, expect } from '@jest/globals';
import { wrapWith, wrapWithHtml } from '../../src/utils/wrappers.js';

describe('wrapWith', () => {
  test('wraps content with a string wrapper', () => {
    expect(wrapWith('content', '*')).toBe('*content*');
  });

  test('returns empty string when content is null/undefined', () => {
    expect(wrapWith(null, '*')).toBe('');
    expect(wrapWith(undefined, '*')).toBe('');
  });

  test('handles empty string content', () => {
    expect(wrapWith('', '*')).toBe('**');
  });

  test('wraps with object wrapper', () => {
    const wrapper = { open: '<', close: '>' };
    expect(wrapWith('content', wrapper)).toBe('<content>');
  });

  test('handles partial object wrapper', () => {
    expect(wrapWith('content', { open: '<' })).toBe('<content');
    expect(wrapWith('content', { close: '>' })).toBe('content>');
  });

  test('converts non-string content to string', () => {
    expect(wrapWith(123, '*')).toBe('*123*');
    expect(wrapWith(true, '*')).toBe('*true*');
  });
});

describe('wrapWithHtml', () => {
  test('wraps content with HTML tag', () => {
    expect(wrapWithHtml('div', 'content')).toBe('<div>content</div>');
  });

  test('handles empty content', () => {
    expect(wrapWithHtml('div', '')).toBe('<div></div>');
  });

  test('returns content when tagName is falsy', () => {
    expect(wrapWithHtml('', 'content')).toBe('content');
    expect(wrapWithHtml(null, 'content')).toBe('content');
    expect(wrapWithHtml(undefined, 'content')).toBe('content');
  });

  test('adds attributes to the opening tag', () => {
    const attributes = { id: 'test', class: 'example', disabled: true };
    const result = wrapWithHtml('button', 'Click me', attributes);
    expect(result).toContain('id="test"');
    expect(result).toContain('class="example"');
    expect(result).toContain('disabled');
    expect(result).toMatch(/^<button[^>]+>Click me<\/button>$/);
  });

  test('handles special characters in attributes', () => {
    const result = wrapWithHtml('input', '', {
      type: 'text',
      value: 'test "quote"',
      'data-test': 'test&value'
    });

    expect(result).toContain('value="test &quot;quote&quot;"');
    expect(result).toContain('data-test="test&amp;value"');
  });

  test('handles boolean attributes', () => {
    const result = wrapWithHtml('input', '', {
      disabled: true,
      readonly: false,
      required: true
    });

    expect(result).toContain('disabled');
    expect(result).not.toContain('readonly');
    expect(result).toContain('required');
  });
});
