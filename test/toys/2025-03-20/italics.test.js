import { italics } from '../../../src/toys/2025-03-20/italics.js';

describe('italics function', () => {
  test('returns non-string values unchanged', () => {
    expect(italics(null)).toBe(null);
    expect(italics(undefined)).toBe(undefined);
    expect(italics(42)).toBe(42);
    expect(italics(true)).toBe(true);
    expect(italics({})).toEqual({});
    expect(italics([])).toEqual([]);
  });

  test('leaves regular text unchanged', () => {
    expect(italics('Regular text without markdown')).toBe('Regular text without markdown');
    expect(italics('')).toBe('');
  });

  test('adds <em> tags around asterisk-style italics while preserving asterisks', () => {
    expect(italics('This is *italic* text')).toBe('This is <em>*italic*</em> text');
    expect(italics('*Start* and end')).toBe('<em>*Start*</em> and end');
    expect(italics('Start and *end*')).toBe('Start and <em>*end*</em>');
    expect(italics('Multiple *italic* words in *one* string')).toBe('Multiple <em>*italic*</em> words in <em>*one*</em> string');
  });

  test('adds <em> tags around underscore-style italics while preserving underscores', () => {
    expect(italics('This is _italic_ text')).toBe('This is <em>_italic_</em> text');
    expect(italics('_Start_ and end')).toBe('<em>_Start_</em> and end');
    expect(italics('Start and _end_')).toBe('Start and <em>_end_</em>');
    expect(italics('Multiple _italic_ words in _one_ string')).toBe('Multiple <em>_italic_</em> words in <em>_one_</em> string');
  });

  test('handles both asterisk and underscore styles in the same string', () => {
    expect(italics('*Asterisk* and _underscore_')).toBe('<em>*Asterisk*</em> and <em>_underscore_</em>');
    expect(italics('Text with _multiple_ *italic* _formats_ mixed *in*')).toBe(
      'Text with <em>_multiple_</em> <em>*italic*</em> <em>_formats_</em> mixed <em>*in*</em>'
    );
  });
});
